import socketio


origins = [
    "http://localhost:5173",  # Your Vite/React frontend
    "http://localhost:3000",  # Another common port for React
    # IMPORTANT: Add your deployed Render frontend URL here later!
    # "https://your-app-name.onrender.com"
    "https://vaad-vivaad-app.onrender.com"
]

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=origins  # <-- USE THE LIST, NOT '*'
)