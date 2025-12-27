import os
import time
import shutil
import requests
import base64
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room

# --- CONFIGURATION ---
# 1. Get the API Key securely from Render environment variables
MESHY_API_KEY = os.environ.get("MESHY_API_KEY")

# 2. Get the Public URL so Meshy can access our uploaded images
# Render automatically provides 'RENDER_EXTERNAL_URL'.
# If running locally, you would need to set this manually (e.g., to an ngrok URL).
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
    """
    Deletes sessions older than 1 hour to save space on the server.
    """
    try:
        current_time = time.time()
        MAX_AGE = 3600 # 1 Hour in seconds
        if os.path.exists(UPLOAD_FOLDER):
            for folder_name in os.listdir(UPLOAD_FOLDER):
                folder_path = os.path.join(UPLOAD_FOLDER, folder_name)
                # Only check directories (sessions)
                if os.path.isdir(folder_path):
                    # Check if the folder is older than MAX_AGE
                    if current_time - os.path.getmtime(folder_path) > MAX_AGE:
                        print(f"🧹 Janitor: Deleting old session {folder_name}")
                        shutil.rmtree(folder_path)
    except Exception as e:
        print(f"Janitor Error: {e}")

# --- MESHY API HANDLER (The New Engine) ---
def generate_mesh_with_api(image_urls, output_path):
    """
    Sends images to Meshy.ai API and waits for the generated 3D model.
    """
    if not MESHY_API_KEY:
        print("❌ Error: MESHY_API_KEY is missing! Set it in Render Environment.")
        return False

    headers = {'Authorization': f'Bearer {MESHY_API_KEY}'}
    
    # Payload for Meshy-5 (Multi-View)
    # We use 'preview' mode for speed. Change to 'refine' for higher quality (costs more credits).
    payload = {
        "mode": "preview", 
        "image_urls": image_urls[:4], # Meshy currently accepts max 4 images for this mode
        "enable_pbr": True,
        "should_remesh": True
    }
    
    print(f"📡 Sending {len(payload['image_urls'])} images to Meshy API...")
    
    try:
        # STEP 1: CREATE TASK
        response = requests.post(
            "https://api.meshy.ai/v1/image-to-3d", 
            json=payload, 
            headers=headers
        )
        response.raise_for_status() # Raise error for bad status codes (4xx, 5xx)
        task_id = response.json()['result']
        print(f"✅ Task Started: {task_id}")
        
        # STEP 2: POLLING LOOP (Wait for result)
        # We check every 2 seconds if the job is done.
        for _ in range(60): # Timeout after 2 minutes (60 * 2s)
            time.sleep(2)
            status_res = requests.get(
                f"https://api.meshy.ai/v1/image-to-3d/{task_id}", 
                headers=headers
            )
            status_data = status_res.json()
            
            state = status_data.get('status')
            progress = status_data.get('progress', 0)
            
            # Optional: You could emit progress updates to the frontend here if you wanted
            # print(f"⏳ AI Progress: {progress}%")
            
            if state == 'SUCCEEDED':
                # STEP 3: DOWNLOAD RESULT
                model_url = status_data['model_urls']['glb']
                print(f"🎉 Success! Downloading GLB from: {model_url}")
                
                # Download the GLB file to our server storage
                model_data = requests.get(model_url)
                with open(output_path, 'wb') as f:
                    f.write(model_data.content)
                return True
                
            if state == 'FAILED':
                print(f"❌ API Failed: {status_data.get('task_error')}")
                return False
                
    except Exception as e:
        print(f"API Connection Error: {e}")
        return False
    
    return False

# --- ROUTES ---
@app.route('/')
@app.route('/health')
@app.route('/ping')
def health_check():
    return "Replicator Engine Online", 200

@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    # This allows Meshy (and the frontend) to access the uploaded images
    path = os.path.join(UPLOAD_FOLDER, room_id)
    return send_from_directory(path, filename)

# --- SOCKETS ---
@socketio.on('join_session')
def handle_join(data):
    # Trigger cleanup whenever a new session starts
    cleanup_storage()
    
    room = data.get('sessionId')
    device_type = data.get('type')
    
    if room:
        join_room(room)
        print(f"Device ({device_type}) joined session: {room}")
        if device_type == 'sensor':
            emit('session_status', {'status': 'connected'}, room=room)

@socketio.on('send_frame')
def handle_frame(data):
    room = data.get('roomId')
    image_data = data.get('image')
    
    if room and image_data:
        session_path = os.path.join(UPLOAD_FOLDER, room)
        if not os.path.exists(session_path):
            os.makedirs(session_path)
            
        try:
            # Decode and Save Image
            header, encoded = image_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            
            # Use timestamp for filename to keep order
            filename = f"{int(time.time() * 1000)}.jpg"
            file_path = os.path.join(session_path, filename)
            
            with open(file_path, "wb") as f:
                f.write(file_data)
                
            # Send back confirmation + count to update UI
            count = len(os.listdir(session_path))
            emit('frame_received', {
                'image': image_data, 
                'count': count
            }, room=room, include_self=False)
            
        except Exception as e:
            print(f"Error saving image: {e}")

@socketio.on('process_3d')
def handle_process(data):
    room = data.get('sessionId')
    
    if room:
        emit('processing_status', {'step': 'Uploading to Neural Cloud...'}, room=room)
        
        session_path = os.path.join(UPLOAD_FOLDER, room)
        
        # Check if we have images
        if not os.path.exists(session_path):
             emit('processing_status', {'step': 'Error: No scans found'}, room=room)
             return

        # 1. Select Images for the API
        local_files = sorted([f for f in os.listdir(session_path) if f.endswith('.jpg')])
        
        if len(local_files) < 1:
            emit('processing_status', {'step': 'Error: Need at least 1 photo'}, room=room)
            return

        # SMART SELECTION: Pick 4 distinct images if user took many
        selected_files = []
        if len(local_files) > 4:
            step = len(local_files) // 4
            for i in range(4):
                selected_files.append(local_files[i * step])
        else:
            selected_files = local_files # Take all if 4 or less

        # 2. Convert local filenames to Public URLs that Meshy can reach
        image_urls = [f"{BACKEND_PUBLIC_URL}/files/{room}/{f}" for f in selected_files]
        
        # 3. Call AI API
        emit('processing_status', {'step': 'AI Generation in Progress...'}, room=room)
        output_filename = "reconstruction.glb" # Meshy returns GLB
        output_path = os.path.join(session_path, output_filename)
        
        success = generate_mesh_with_api(image_urls, output_path)
        
        if success:
            emit('model_ready', {'url': output_filename}, room=room)
        else:
            emit('processing_status', {'step': 'AI Generation Failed. Check logs.'}, room=room)

if __name__ == '__main__':
    # Use the PORT provided by Render
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting server on port {port}...")
    socketio.run(app, debug=False, host='0.0.0.0', port=port)