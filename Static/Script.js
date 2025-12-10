// CONFIGURACIÓN
const API_BASE_URL = window.location.origin;
let currentModel = 'auto';
let messageCount = 0;
let tokensUsed = 0;
let responseTimes = [];

// ELEMENTOS DEL DOM
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');
const currentModelElement = document.getElementById('currentModel');
const backendStatus = document.getElementById('backendStatus');
const keysStatus = document.getElementById('keysStatus');
const modelsCount = document.getElementById('modelsCount');
const lastResponseTime = document.getElementById('lastResponseTime');
const modelsList = document.getElementById('modelsList');
const messagesToday = document.getElementById('messagesToday');
const tokensUsedElement = document.getElementById('tokensUsed');
const avgResponseTime = document.getElementById('avgResponseTime');
const statusIndicator = document.getElementById('statusIndicator');

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    checkBackendStatus();
    loadModels();
    setupEventListeners();
    loadFromLocalStorage();
    
    // Auto-ajustar altura del textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // Permitir enviar con Enter (Shift+Enter para nueva línea)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// VERIFICAR ESTADO DEL BACKEND
async function checkBackendStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            backendStatus.textContent = '✅ Conectado';
            backendStatus.className = 'status-value active';
            updateStatusIndicator(true);
            
            // Verificar API Keys
            const data = await response.json();
            keysStatus.textContent = data.key_status;
        }
    } catch (error) {
        backendStatus.textContent = '❌ Desconectado';
        backendStatus.className = 'status-value';
        updateStatusIndicator(false);
        console.error('Error conectando al backend:', error);
    }
}

// ACTUALIZAR INDICADOR DE ESTADO
function updateStatusIndicator(isOnline) {
    const dot = statusIndicator.querySelector('.status-dot');
    const text = statusIndicator.querySelector('span');
    
    if (isOnline) {
        dot.style.background = '#10b981';
        text.textContent = 'Conectado';
        statusIndicator.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } else {
        dot.style.background = '#ef4444';
        text.textContent = 'Desconectado';
        statusIndicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
}

// CARGAR MODELOS DISPONIBLES
async function loadModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/models`);
        const data = await response.json();
        
        if (data.models) {
            modelsCount.textContent = data.models.length;
            renderModelsList(data.models);
        }
    } catch (error) {
        console.error('Error cargando modelos:', error);
        modelsCount.textContent = '0';
    }
}

// RENDERIZAR LISTA DE MODELOS
function renderModelsList(models) {
    modelsList.innerHTML = '';
    
    models.forEach(model => {
        const modelElement = document.createElement('div');
        modelElement.className = 'model-item';
        modelElement.innerHTML = `
            <div class="model-name">
                <i class="fas fa-microchip"></i>
                ${model.name}
                <span class="key-status">${model.key_configured ? '🔑' : '🔒'}</span>
            </div>
            <div class="model-desc">${model.description}</div>
            <div class="model-for">
                ${model.best_for.map(item => `<span>${item}</span>`).join('')}
            </div>
        `;
        
        if (model.key_configured) {
            modelElement.style.borderLeftColor = '#10b981';
        }
        
        modelsList.appendChild(modelElement);
    });
}

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    // Enviar mensaje
    sendButton.addEventListener('click', sendMessage);
    
    // Limpiar chat
    clearButton.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres limpiar toda la conversación?')) {
            clearChat();
        }
    });
    
    // Ejemplos rápidos
    document.querySelectorAll('.example-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const exampleText = e.target.closest('.example-btn').dataset.example;
            messageInput.value = exampleText;
            autoResizeTextarea();
            messageInput.focus();
        });
    });
    
    // Características especiales
    document.getElementById('featuresButton').addEventListener('click', () => {
        showFeaturesModal();
    });
}

// AUTO-REDIMENSIONAR TEXTAREA
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

// ENVIAR MENSAJE
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Agregar mensaje del usuario
    addMessageToChat('user', message);
    messageInput.value = '';
    autoResizeTextarea();
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    try {
        const startTime = Date.now();
        
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        hideTypingIndicator();
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizar modelo actual
            currentModel = data.model_used;
            currentModelElement.innerHTML = `<i class="fas fa-brain"></i> ${data.model_used}`;
            
            // Actualizar estadísticas
            updateStatistics(data, responseTime);
            
            // Mostrar respuesta de la IA
            await typewriterEffect(data.response, 'ai');
            
        } else {
            addMessageToChat('ai', `⚠️ ${data.response || 'Error en la respuesta'}`);
        }
        
        // Actualizar última respuesta
        const now = new Date();
        lastResponseTime.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('ai', '❌ Error de conexión. Por favor, verifica tu conexión e intenta nuevamente.');
        console.error('Error:', error);
    }
    
    // Guardar en localStorage
    saveToLocalStorage();
}

// AGREGAR MENSAJE AL CHAT
function addMessageToChat(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Procesar texto para formato especial
    const processedText = formatMessageText(text);
    
    messageDiv.innerHTML = `
        <div class="avatar">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <strong>${sender === 'user' ? 'Tú' : 'Sofi AI'}</strong>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text">${processedText}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Incrementar contador
    if (sender === 'user') {
        messageCount++;
        messagesToday.textContent = messageCount;
        saveToLocalStorage();
    }
}

// FORMATO ESPECIAL PARA MENSAJES (como yo lo hago)
function formatMessageText(text) {
    let formatted = text
        // Código en bloque
        .replace(/```([\s\S]*?)```/g, (match, code) => {
            const lang = code.split('\n')[0].match(/^\w+/) ? code.split('\n')[0] : '';
            const codeContent = lang ? code.substring(lang.length).trim() : code.trim();
            return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(codeContent)}</code></pre>`;
        })
        
        // Código en línea
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // Negritas
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        
        // Itálicas
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        
        // Listas
        .replace(/^\- (.+)$/gm, '• $1')
        
        // Párrafos
        .replace(/\n\n/g, '<br><br>')
        
        // Enlaces (simple)
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--accent-color);">$1</a>');
    
    // Aplicar highlight.js después de que el contenido esté en el DOM
    setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            
            // Agregar botón de copiar
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.innerHTML = '<i class="far fa-copy"></i>';
            button.title = 'Copiar código';
            button.onclick = () => copyToClipboard(block.innerText);
            block.parentNode.style.position = 'relative';
            block.parentNode.appendChild(button);
        });
    }, 100);
    
    return formatted;
}

// EFECTO MÁQUINA DE ESCRIBIR (como yo respondo)
async function typewriterEffect(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    messageDiv.innerHTML = `
        <div class="avatar">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <strong>${sender === 'user' ? 'Tú' : 'Sofi AI'}</strong>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-text" id="typingMessage"></div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    const messageTextElement = messageDiv.querySelector('#typingMessage');
    let i = 0;
    
    // Velocidad de escritura variable (más lento para código)
    function typeCharacter() {
        if (i < text.length) {
            // Detectar si viene código
            if (text.substring(i, i + 3) === '```') {
                // Encontrar el final del bloque de código
                const endIndex = text.indexOf('```', i + 3);
                if (endIndex !== -1) {
                    const codeBlock = text.substring(i, endIndex + 3);
                    messageTextElement.innerHTML += formatMessageText(codeBlock);
                    i = endIndex + 3;
                    setTimeout(typeCharacter, 50);
                } else {
                    messageTextElement.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(typeCharacter, 30);
                }
            } else {
                messageTextElement.innerHTML += text.charAt(i);
                i++;
                
                // Velocidad variable
                const char = text.charAt(i);
                const delay = char === '.' || char === '!' || char === '?' ? 100 :
                             char === ',' || char === ';' ? 70 :
                             char === ' ' ? 20 : 30;
                
                setTimeout(typeCharacter, delay);
            }
            scrollToBottom();
        } else {
            // Aplicar formato final y highlight.js
            messageTextElement.innerHTML = formatMessageText(text);
            scrollToBottom();
        }
    }
    
    typeCharacter();
}

// MOSTRAR/OCULTAR INDICADOR DE ESCRITURA
function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// ACTUALIZAR ESTADÍSTICAS
function updateStatistics(data, responseTime) {
    // Tokens
    if (data.tokens) {
        tokensUsed += data.tokens;
        tokensUsedElement.textContent = tokensUsed.toLocaleString();
    }
    
    // Tiempo promedio de respuesta
    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    avgResponseTime.textContent = `${Math.round(avgTime / 10) / 100}s`;
    
    saveToLocalStorage();
}

// LIMPIAR CHAT
function clearChat() {
    // Mantener solo el mensaje de bienvenida
    const welcomeMessage = messagesContainer.querySelector('.message.ai-message');
    messagesContainer.innerHTML = '';
    
    if (welcomeMessage) {
        messagesContainer.appendChild(welcomeMessage);
    }
    
    // Resetear algunas estadísticas
    messageCount = 0;
    messagesToday.textContent = '0';
    tokensUsed = 0;
    tokensUsedElement.textContent = '0';
    responseTimes = [];
    avgResponseTime.textContent = '0s';
    
    saveToLocalStorage();
}

// MOSTRAR MODAL DE CARACTERÍSTICAS
function showFeaturesModal() {
    const features = [
        '🤖 **Selección inteligente de modelos**: Elijo el mejor modelo para cada pregunta',
        '💡 **Razonamiento paso a paso**: Explico procesos detalladamente',
        '👩‍💻 **Sintaxis de código**: Resalto código con colores y formato',
        '🎯 **Respuestas claras**: Me enfoco en ser precisa y útil',
        '🚀 **Respuesta en tiempo real**: Efecto máquina de escribir',
        '📊 **Estadísticas**: Mido tokens y tiempos de respuesta',
        '💾 **Guardado automático**: Tu conversación se guarda localmente'
    ];
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary);
            border: 2px solid var(--primary-color);
            border-radius: var(--border-radius);
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: var(--shadow-lg);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-star" style="color: var(--accent-color);"></i>
                    Características de Sofi AI
                </h2>
                <button id="closeModal" style="
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                ">×</button>
            </div>
            <div style="color: var(--text-secondary); line-height: 1.6;">
                ${features.map(f => `<p style="margin-bottom: 15px; padding-left: 10px; border-left: 3px solid var(--primary-color);">${f}</p>`).join('')}
            </div>
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                <p style="color: var(--text-muted); font-size: 14px; text-align: center;">
                    🤖 Diseñado para respuestas claras, detalladas y útiles, ¡como siempre!
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal
    modal.querySelector('#closeModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// UTILIDADES
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Mostrar notificación de copiado
        const notification = document.createElement('div');
        notification.textContent = '✅ Código copiado';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border-radius: var(--border-radius);
            z-index: 1000;
            animation: fadeInOut 2s;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 2000);
    });
}

// LOCAL STORAGE
function saveToLocalStorage() {
    const chatData = {
        messageCount,
        tokensUsed,
        responseTimes,
        timestamp: Date.now()
    };
    localStorage.setItem('sofiAIStats', JSON.stringify(chatData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('sofiAIStats');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            messageCount = data.messageCount || 0;
            tokensUsed = data.tokensUsed || 0;
            responseTimes = data.responseTimes || [];
            
            messagesToday.textContent = messageCount;
            tokensUsedElement.textContent = tokensUsed.toLocaleString();
            
            if (responseTimes.length > 0) {
                const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                avgResponseTime.textContent = `${Math.round(avgTime / 10) / 100}s`;
            }
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    }
}

// ANIMACIÓN PARA NOTIFICACIONES
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(10px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(10px); }
    }
    
    .copy-code-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        color: var(--text-primary);
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: var(--transition-fast);
    }
    
    .copy-code-btn:hover {
        background: rgba(99, 102, 241, 0.4);
        transform: scale(1.05);
    }
`;
document.head.appendChild(style);