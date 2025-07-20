document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    let qaData = {
        systemPrompt: '',
        examples: []
    };

    // Cargar datos iniciales
    loadQAData();

    // Función para cargar los datos
    async function loadQAData() {
        try {
            const response = await fetch('http://localhost:3000/api/qa');
            qaData = await response.json();
        } catch (error) {
            console.error('Error al cargar los datos:', error);
        }
    }

    // Función para formatear el texto
    function formatText(text) {
        // Primero manejar enlaces de PDF
        text = text.replace(/\[([^\]]+)\]\(pdf:([^)]+)\)/g, 
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
        
        // Scroll al final del chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para detectar la carrera en la pregunta del usuario
    function detectarCarreraEnPregunta(pregunta) {
        const carreras = [
            'Ingeniería en Informática',
            'Arquitectura',
            'Ingeniería Civil',
            'Ingeniería Electromecánica',
            'Ingeniería Agronómica',
            'Ingeniería Mecánica Automotriz'
        ];
        const lower = pregunta.toLowerCase();
        for (const carrera of carreras) {
            if (lower.includes(carrera.toLowerCase())) {
                return carrera;
            }
        }
        return null;
    }

    // Función para construir el prompt con contexto
    function buildPrompt(userQuestion) {
        // Detectar carrera en la pregunta
        const carreraDetectada = detectarCarreraEnPregunta(userQuestion);
        let prompt = `${qaData.systemPrompt}\n\n`;
        prompt += "Ejemplos de preguntas y respuestas:\n";
        let ejemplosFiltrados;
        if (carreraDetectada) {
            ejemplosFiltrados = qaData.examples.filter(ej => (ej.carrera === carreraDetectada || ej.carrera === 'General'));
            prompt += `(Contexto: Respuestas solo de la carrera ${carreraDetectada})\n`;
        } else {
            ejemplosFiltrados = qaData.examples;
            prompt += "(No se detectó la carrera en la pregunta. Si la respuesta no es precisa, por favor aclara a qué carrera te refieres.)\n";
        }
        ejemplosFiltrados.forEach(example => {
            prompt += `Pregunta: ${example.question}\nRespuesta: ${example.answer}\n\n`;
        });
        prompt += `Pregunta actual: ${userQuestion}\nRespuesta:`;
        return prompt;
    }

    // Función para enviar mensaje a Ollama
    async function sendToOllama(message) {
        try {
            console.log('Enviando mensaje a Ollama:', message);
            
            const prompt = buildPrompt(message);
            console.log('Prompt completo:', prompt);
            
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gemma3:1b',
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta de Ollama:', data);

            if (!data.response) {
                throw new Error('No se recibió respuesta del modelo');
            }

            return data.response;
        } catch (error) {
            console.error('Error detallado:', error);
            return 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.';
        }
    }

    // Función para manejar el envío de mensajes
    async function handleSendMessage() {
        const message = userInput.value.trim();
        if (message) {
            // Agregar mensaje del usuario
            addMessage(message, true);
            userInput.value = '';

            // Mostrar indicador de "escribiendo..."
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot';
            typingDiv.innerHTML = '<div class="message-content">Escribiendo...</div>';
            chatMessages.appendChild(typingDiv);

            try {
                // Obtener respuesta de Ollama
                const response = await sendToOllama(message);

                // Remover indicador de "escribiendo..."
                chatMessages.removeChild(typingDiv);

                // Agregar respuesta del bot
                addMessage(response);
            } catch (error) {
                console.error('Error en handleSendMessage:', error);
                chatMessages.removeChild(typingDiv);
                addMessage('Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.');
            }
        }
    }

    // Event listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}); 