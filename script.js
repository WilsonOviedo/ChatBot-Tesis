document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    let currentContext = null; // Contexto de carrera actual

    // Función para formatear el texto
    function formatText(text) {
        // Primero manejar enlaces de PDF
        text = text.replace(/\[([^\]]+)\]\(pdf:([^\)]+)\)/g, 
            '<a href="/pdfs/$2" download class="pdf-link">📄 $1</a>');
        // Luego aplicar el formateo normal
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // Función para agregar mensajes al chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        if (isUser) {
            messageContent.textContent = message;
        } else {
            messageContent.innerHTML = formatText(message);
        }
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Nueva función para enviar pregunta al backend
    async function sendToBackend(question) {
        try {
            const response = await fetch('http://localhost:3000/api/qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, context: currentContext })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // Si el backend devuelve un nuevo contexto, actualizarlo
            if (data.context) {
                currentContext = data.context;
            }
            // Si la respuesta es un array, únela en un solo string (por compatibilidad)
            if (Array.isArray(data.answer)) {
                return data.answer.map((ans, i) => `<b>Respuesta ${i+1}:</b><br>${ans}`).join('<br><br>');
            }
            return data.answer || 'No se recibió respuesta.';
        } catch (error) {
            console.error('Error detallado:', error);
            return 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.';
        }
    }

    // Función para manejar el envío de mensajes
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot';
            typingDiv.innerHTML = '<div class="message-content">Escribiendo...</div>';
            chatMessages.appendChild(typingDiv);
            try {
                const response = await sendToBackend(message);
                chatMessages.removeChild(typingDiv);
                addMessage(response);
            } catch (error) {
                console.error('Error en handleSendMessage:', error);
                chatMessages.removeChild(typingDiv);
                addMessage('Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.');
            }
        }
    }

    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}); 