import base64
import os
import time
import trimesh
import numpy as np
from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from flask import send_from_directory # <--- ADD THIS

# 1. SETUP - Create the App and Socket BEFORE using them
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 2. FOLDER SETUP
UPLOAD_FOLDER = 'scans'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 3. ROUTES & EVENTS
@app.route('/')

# --- SERVE FILES ---
@app.route('/files/<room_id>/<filename>')
def serve_file(room_id, filename):
    # This lets the frontend grab the STL file from the specific session folder
    path = os.path.join(UPLOAD_FOLDER, room_id)
    return send_from_directory(path, filename)

def home():
    return jsonify({"message": "Shadow Sculpture Backend is Live", "status": "running"})

@socketio.on('connect')
def handle_connect():
    print('Client connected to socket')

@socketio.on('join_session')
def handle_join(data):
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
        # Create folder for session
        session_path = os.path.join(UPLOAD_FOLDER, room)
        if not os.path.exists(session_path):
            os.makedirs(session_path)
            
        try:
            # Decode and Save Image
            header, encoded = image_data.split(",", 1)
            file_data = base64.b64decode(encoded)
            
            filename = f"{int(time.time() * 1000)}.jpg"
            file_path = os.path.join(session_path, filename)
            
            with open(file_path, "wb") as f:
                f.write(file_data)
                
            print(f"Saved frame to {file_path}")
            
            # Send back confirmation + count
            count = len(os.listdir(session_path))
            emit('frame_received', {
                'image': image_data, 
                'count': count
            }, room=room, include_self=False)
            
        except Exception as e:
            print(f"Error saving image: {e}")

# --- THE NEW 3D PROCESSOR ---
@socketio.on('process_3d')
def handle_process(data):
    room = data.get('sessionId')
    print(f"Processing 3D Model for session: {room}...")
    
    if room:
        # Step 1: Notify "Initializing"
        emit('processing_status', {'step': 'Initializing Voxel Engine...'}, room=room)
        socketio.sleep(1) # Fake delay for effect
        
        # Step 2: Notify "Analyzing"
        emit('processing_status', {'step': 'Analyzing Depth Maps...'}, room=room)
        socketio.sleep(1)
        
        # Step 3: Generate Mesh (Using Trimesh)
        # We create a random "alien artifact" shape for the demo
        mesh = trimesh.creation.icosphere(subdivisions=3, radius=10.0)
        
        # Add some random noise to vertices to make it look scanned
        for i, vertex in enumerate(mesh.vertices):
            mesh.vertices[i] += (np.random.random(3) - 0.5) * 1.5

        # Step 4: Save STL
        session_path = os.path.join(UPLOAD_FOLDER, room)
        if not os.path.exists(session_path):
            os.makedirs(session_path)

        output_filename = "reconstruction.stl"
        output_path = os.path.join(session_path, output_filename)
        
        mesh.export(output_path)
        print(f"Mesh saved to: {output_path}")
        
        # Step 5: Notify "Done"
        emit('model_ready', {'url': output_filename}, room=room)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# 4. RUN SERVER

if __name__ == '__main__':
    # Use the PORT environment variable provided by Render, or default to 5001
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting server on port {port}...")
    socketio.run(app, debug=False, host='0.0.0.0', port=port)