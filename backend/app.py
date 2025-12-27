import os
import time
import shutil
import requests
import base64
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room

# --- CONFIGURATION ---
MESHY_API_KEY = os.environ.get("MESHY_API_KEY")
BACKEND_PUBLIC_URL = os.environ.get("RENDER_EXTERNAL_URL", "https://replicator-backend.onrender.com")

# 1. SETUP
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = 'scans'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- JANITOR (Cleanup) ---
def cleanup_storage():
    """Deletes sessions older than 1 hour to save space."""
    try:
        current_time = time.time()
        MAX_AGE = 3600 
        if os.path.exists(UPLOAD_FOLDER):
            for folder_name in os.listdir(UPLOAD_FOLDER):
                folder_path = os.path.join(UPLOAD_FOLDER, folder_name)
                if os.path.isdir(folder_path):
                    if current_time - os.path.getmtime(folder_path) > MAX_AGE:
                        print(f"🧹 Janitor: Deleting old session {folder_name}")
                        shutil.rmtree(folder_path)
    except Exception as e:
        print(f"⚠️ Janitor Warning: Could not clean storage. Reason: {e}")

# --- MESHY API HANDLER ---
def generate_mesh_with_api(image_urls, output_path):
    if not MESHY_API_KEY:
        print("❌ CRITICAL ERROR: MESHY_API_KEY is missing in Render Environment!")
        return "MISSING_KEY"

    headers = {'Authorization': f'Bearer {MESHY_API_KEY}'}
    
    payload = {
        "mode": "preview", 
        "image_urls": image_urls[:4],
        "enable_pbr": True,
        "should_remesh": True
    }
    
    print(f"📡 API CALL: Sending {len(payload['image_urls'])} images to Meshy...")
    
    try:
        # STEP 1: CREATE TASK
        response = requests.post("https://api.meshy.ai/v1/image-to-3d", json=payload, headers=headers)
        
        # --- NEW: DETAILED ERROR CATCHING ---
        if response.status_code == 402:
            print("🚨 API ERROR: Payment Required. You are out of Meshy Credits.")
            return "OUT_OF_CREDITS"
        
        if response.status_code == 401:
            print("🚨 API ERROR: Unauthorized. Check your API Key.")
            return "INVALID_KEY"
            
        response.raise_for_status() # Catch other HTTP errors
        task_id = response.json()['result']
        print(f"✅ API SUCCESS: Task Started (ID: {task_id})")
        
        # STEP 2: POLLING
        for _ in range(60): 
            time.sleep(2)
            status_res = requests.get(f"https://api.meshy.ai/v1/image-to-3d/{task_id}", headers=headers)
            status_data = status_res.json()
            state = status_data.get('status')
            
            if state == 'SUCCEEDED':
                model_url = status_data['model_urls']['glb']
                print(f"🎉 DOWNLOAD: Retrieving model from {model_url}")
                model_data = requests.get(model_url)
                with open(output_path, 'wb') as f:
                    f.write(model_data.content)
                return "SUCCESS"
                
            if state == 'FAILED':
                error_msg = status_data.get('task_error', 'Unknown Error')
                print(f"❌ API FAILED during generation. Reason: {error_msg}")
                return "GENERATION_FAILED"
                
    except Exception as e:
        print(f"💥 UNEXPECTED CRASH: {e}")
        return "CRASH"
    
    return "TIMEOUT"

# --- ROUTES ---
@app.route('/')
@app.route('/health')
@app.route('/ping') # The fix for your 404 error
def health_check():
    return "Replicator Engine Online", 200

@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    path = os.path.join(UPLOAD_FOLDER, room_id)
    return send_from_directory(path, filename)

# --- SOCKETS ---
@socketio.on('join_session')
def handle_join(data):
    cleanup_storage()
    room = data.get('sessionId')
    device_type = data.get('type')
    if room:
        join_room(room)
        print(f"🔵 Socket: Device ({device_type}) joined {room}")
        if device_type == 'sensor':
            emit('session_status', {'status': 'connected'}, room=room)

@socketio.on('send_frame')
def handle_frame(data):
    room = data.get('roomId')
    image_data = data.get('image')
    if room and image_data:
        session_path = os.path.join(UPLOAD_FOLDER, room)
        if not os.path.exists(session_path): os.makedirs(session_path)
        try:
            header, encoded = image_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            filename = f"{int(time.time() * 1000)}.jpg"
            with open(os.path.join(session_path, filename), "wb") as f:
                f.write(file_data)
            count = len(os.listdir(session_path))
            print(f"📸 Image Saved. Count: {count}")
            emit('frame_received', {'image': image_data, 'count': count}, room=room, include_self=False)
        except Exception as e:
            print(f"⚠️ Image Save Error: {e}")

@socketio.on('process_3d')
def handle_process(data):
    room = data.get('sessionId')
    if room:
        emit('processing_status', {'step': 'Uploading to Neural Cloud...'}, room=room)
        session_path = os.path.join(UPLOAD_FOLDER, room)
        
        if not os.path.exists(session_path):
             emit('processing_status', {'step': 'Error: No scans found'}, room=room)
             return

        local_files = sorted([f for f in os.listdir(session_path) if f.endswith('.jpg')])
        if len(local_files) < 1:
            emit('processing_status', {'step': 'Error: Need at least 1 photo'}, room=room)
            return

        # Smart Selection
        selected_files = []
        if len(local_files) > 4:
            step = len(local_files) // 4
            for i in range(4):
                selected_files.append(local_files[i * step])
        else:
            selected_files = local_files

        image_urls = [f"{BACKEND_PUBLIC_URL}/files/{room}/{f}" for f in selected_files]
        
        emit('processing_status', {'step': 'AI Generation in Progress...'}, room=room)
        output_filename = "reconstruction.glb"
        output_path = os.path.join(session_path, output_filename)
        
        # Call API and check specific return codes
        result_code = generate_mesh_with_api(image_urls, output_path)
        
        if result_code == "SUCCESS":
            emit('model_ready', {'url': output_filename}, room=room)
        elif result_code == "OUT_OF_CREDITS":
            emit('processing_status', {'step': 'Error: Meshy AI Credits Exhausted'}, room=room)
        elif result_code == "INVALID_KEY":
            emit('processing_status', {'step': 'Error: Invalid API Key'}, room=room)
        else:
            emit('processing_status', {'step': f'Failed: {result_code}'}, room=room)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    print(f"🚀 Starting server on port {port}...")
    socketio.run(app, debug=False, host='0.0.0.0', port=port)