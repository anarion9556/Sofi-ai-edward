from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return '''
    <html>
    <head>
        <title>🤖 Sofi AI - Render</title>
        <style>
            body {
                background: #0f172a;
                color: white;
                font-family: sans-serif;
                padding: 40px;
                text-align: center;
            }
            h1 {
                color: #60a5fa;
                font-size: 2.5em;
                margin: 20px 0;
            }
            .box {
                background: #1e293b;
                padding: 30px;
                border-radius: 15px;
                max-width: 600px;
                margin: 20px auto;
                border: 2px solid #3b82f6;
            }
            .btn {
                display: block;
                background: #3b82f6;
                color: white;
                padding: 15px;
                margin: 15px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: bold;
            }
            .btn:hover {
                background: #2563eb;
            }
        </style>
    </head>
    <body>
        <h1>🎉 ¡SOFI AI FUNCIONANDO!</h1>
        <div class="box">
            <p>✅ Backend Flask activo en Render</p>
            <p><strong>Usuario:</strong> Edward</p>
            <p><strong>Hosting:</strong> Render.com</p>
            
            <a href="/health" class="btn">📊 Ver estado del servidor</a>
            <a href="/api/test" class="btn">⚡ Página de prueba</a>
            <a href="/api/models" class="btn">🧠 Modelos disponibles</a>
        </div>
        
        <p style="margin-top: 40px; color: #94a3b8;">
            Hecho con Flask • Render.com • GitHub
        </p>
    </body>
    </html>
    '''

@app.route('/health')
def health():
    return jsonify({
        "status": "online",
        "service": "Sofi AI",
        "version": "1.0",
        "user": "Edward",
        "hosting": "Render.com",
        "message": "¡Backend funcionando correctamente!"
    })

@app.route('/api/test')
def test():
    return jsonify({
        "success": True,
        "endpoints": [
            {"path": "/", "method": "GET", "description": "Página principal"},
            {"path": "/health", "method": "GET", "description": "Estado del servidor"},
            {"path": "/api/test", "method": "GET", "description": "Esta página"},
            {"path": "/api/models", "method": "GET", "description": "Lista de modelos"},
            {"path": "/api/chat", "method": "POST", "description": "Chat con IA"}
        ]
    })

@app.route('/api/models')
def models():
    return jsonify({
        "models": [
            {"name": "Qwen Coder", "for": "Programación"},
            {"name": "DeepSeek", "for": "Razonamiento"},
            {"name": "Amazon Nova", "for": "Conversación"},
            {"name": "Mistral", "for": "Respuestas rápidas"},
            {"name": "Gemini", "for": "Creatividad"}
        ]
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    return jsonify({
        "success": True,
        "message": "Endpoint de chat listo",
        "note": "Configura tus API Keys en Render Dashboard"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print(f"🚀 Sofi AI iniciando en puerto {port}")
    app.run(host='0.0.0.0', port=port)