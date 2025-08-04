document.addEventListener('DOMContentLoaded', () => {
    const qaForm = document.getElementById('qaForm');
    const qaList = document.getElementById('qaList');
    const searchInput = document.getElementById('searchInput');
    const cancelButton = document.getElementById('cancelBtn');
    
    let qaData = {
        systemPrompt: '',
        examples: []
    };
    
    let editingId = null;
    let isAuthenticated = false;
    
    const agentSelector = document.getElementById('agentSelector');
    let agentFiles = [];
    let currentAgentFile = '';

    const similarityInput = document.getElementById('similarityThreshold');
    const saveThresholdBtn = document.getElementById('saveThresholdBtn');

    // Cargar datos iniciales
    loadPDFs();
    loadAgentList();
    
    // Cargar el umbral de similitud al iniciar
    loadSimilarityThreshold();

    // Función para verificar la contraseña
    window.verifyPassword = function() {
        const password = document.getElementById('adminPassword').value;
        // Aquí deberías usar una contraseña segura y encriptada
        // Por ahora usaremos una contraseña simple para demostración
        if (password === 'admin123') {
            isAuthenticated = true;
            document.getElementById('promptAuth').style.display = 'none';
            document.getElementById('promptEditor').style.display = 'block';
            document.getElementById('adminPassword').value = '';
            
            // Asegurar que el textarea tenga el valor actual
            document.getElementById('systemPrompt').value = qaData.systemPrompt;
        } else {
            alert('Contraseña incorrecta');
        }
    };
    
    // Función para cerrar sesión
    window.logoutPrompt = function() {
        isAuthenticated = false;
        document.getElementById('promptAuth').style.display = 'block';
        document.getElementById('promptEditor').style.display = 'none';
        
        // Mantener el valor en el textarea pero deshabilitarlo
        document.getElementById('systemPrompt').value = qaData.systemPrompt;
    };
    
    // Función para cargar los datos
    async function loadQAData() {
        if (!currentAgentFile) {
            console.log('No hay agente seleccionado, saltando carga de datos');
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/qa?agent=${currentAgentFile}`);
            const data = await response.json();
            qaData = data;
            
            // Cargar el systemPrompt en el textarea siempre
            document.getElementById('systemPrompt').value = qaData.systemPrompt;
            
            renderQAList();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('Error al cargar los datos. Por favor, intente nuevamente.');
        }
    }
    
    // Función para guardar el systemPrompt
    window.saveSystemPrompt = async function() {
        if (!isAuthenticated) {
            alert('Debe iniciar sesión para modificar el prompt del sistema');
            return;
        }
        
        if (!currentAgentFile) {
            alert('No hay un agente seleccionado. Por favor, seleccione un agente primero.');
            return;
        }
        
        try {
            const newPrompt = document.getElementById('systemPrompt').value;
            qaData.systemPrompt = newPrompt;
            
            console.log('Enviando datos:', JSON.stringify(qaData));
            console.log('URL:', `http://localhost:3000/api/qa-admin?agent=${currentAgentFile}`);
            
            const response = await fetch(`http://localhost:3000/api/qa-admin?agent=${currentAgentFile}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(qaData)
            });

            console.log('Respuesta del servidor:', response.status, response.statusText);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Respuesta exitosa:', result);
                alert('Prompt del sistema guardado exitosamente');
            } else {
                const errorText = await response.text();
                console.error('Error del servidor:', errorText);
                throw new Error(`Error al guardar: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error al guardar el prompt:', error);
            alert('Error al guardar el prompt. Por favor, intente nuevamente.');
        }
    };
    
    // Función para guardar los datos
    async function saveQAData() {
        try {
            console.log('Guardando en:', `http://localhost:3000/api/qa-file?agent=${currentAgentFile}`);
            console.log('Payload:', JSON.stringify(qaData));
            const response = await fetch(`http://localhost:3000/api/qa-file?agent=${currentAgentFile}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(qaData)
            });
            console.log('Respuesta del backend:', response.status, response.statusText);
            if (response.ok) {
                const result = await response.json();
                alert(result.message || 'Datos guardados exitosamente');
                renderQAList();
            } else {
                const errorText = await response.text();
                console.error('Error al guardar:', errorText);
                throw new Error('Error al guardar');
            }
        } catch (error) {
            console.error('Error al guardar datos:', error);
            alert('Error al guardar los datos. Por favor, intente nuevamente.');
        }
    }
    
    // Función para renderizar la lista de preguntas y respuestas
    function renderQAList() {
        const qaList = document.getElementById('qaList');
        qaList.innerHTML = '';

        qaData.examples.forEach(qa => {
            const qaElement = document.createElement('div');
            qaElement.className = 'qa-item';
            qaElement.innerHTML = `
                <div class="qa-content">
                    <h3>${qa.question}</h3>
                    <p>${formatAnswer(qa.answer)}</p>
                </div>
                <div class="qa-actions">
                    <button onclick="editQA(${qa.id})">Editar</button>
                    <button onclick="deleteQA(${qa.id})">Eliminar</button>
                </div>
            `;
            qaList.appendChild(qaElement);
        });
    }

    // Función para formatear la respuesta
    function formatAnswer(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
    
    // Función para editar una pregunta y respuesta
    window.editQA = function(id) {
        const qa = qaData.examples.find(qa => qa.id === id);
        if (qa) {
            document.getElementById('question').value = qa.question;
            document.getElementById('answer').value = qa.answer;
            editingId = id;
            document.getElementById('cancelBtn').style.display = 'inline-block';
        }
    };
    
    // Función para eliminar una pregunta y respuesta
    window.deleteQA = function(id) {
        if (confirm('¿Está seguro de que desea eliminar esta pregunta y respuesta?')) {
            qaData.examples = qaData.examples.filter(qa => qa.id !== id);
            saveQAData();
        }
    };

    // Función para formatear el texto
    window.formatText = function(fieldId, type) {
        const textarea = document.getElementById(fieldId);
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        let formattedText = '';
        switch(type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'newline':
                formattedText = selectedText + '\n';
                break;
        }
        
        textarea.value = text.substring(0, start) + formattedText + text.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    };
    
    // Manejar el envío del formulario
    qaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = document.getElementById('question').value;
        const answer = document.getElementById('answer').value;
        console.log('Submit: currentAgentFile =', currentAgentFile);
        console.log('Antes de guardar, qaData:', JSON.stringify(qaData));
        if (editingId !== null) {
            // Editar pregunta existente
            const index = qaData.examples.findIndex(qa => qa.id === editingId);
            if (index !== -1) {
                qaData.examples[index] = { id: editingId, question, answer };
            }
            editingId = null;
            document.getElementById('cancelBtn').style.display = 'none';
        } else {
            // Agregar nueva pregunta
            const newId = qaData.examples.length > 0 
                ? Math.max(...qaData.examples.map(qa => qa.id)) + 1 
                : 1;
            qaData.examples.push({ id: newId, question, answer });
        }
        await saveQAData();
        e.target.reset();
    });
    
    // Manejar la búsqueda
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const qaItems = document.querySelectorAll('.qa-item');
        
        qaItems.forEach(item => {
            const question = item.querySelector('h3').textContent.toLowerCase();
            const answer = item.querySelector('p').textContent.toLowerCase();
            
            if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // Manejar el botón de cancelar
    cancelButton.addEventListener('click', () => {
        document.getElementById('qaForm').reset();
        editingId = null;
        document.getElementById('cancelBtn').style.display = 'none';
    });
    
    // Manejar el formulario de subida de PDFs
    const pdfUploadForm = document.getElementById('pdfUploadForm');
    pdfUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        const fileInput = document.getElementById('pdfFile');
        
        if (fileInput.files.length === 0) {
            alert('Por favor, seleccione un archivo PDF');
            return;
        }
        
        formData.append('pdf', fileInput.files[0]);
        
        try {
            const response = await fetch('http://localhost:3000/api/upload-pdf', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                alert('PDF subido exitosamente');
                pdfUploadForm.reset();
                loadPDFs();
            } else {
                throw new Error('Error al subir');
            }
        } catch (error) {
            console.error('Error al subir PDF:', error);
            alert('Error al subir el PDF. Por favor, intente nuevamente.');
        }
    });

    // Función para cargar PDFs
    async function loadPDFs() {
        try {
            const response = await fetch('http://localhost:3000/api/pdfs');
            const pdfFiles = await response.json();
            renderPDFList(pdfFiles);
        } catch (error) {
            console.error('Error al cargar PDFs:', error);
        }
    }
    
    // Función para renderizar la lista de PDFs
    function renderPDFList(pdfFiles) {
        const pdfItems = document.getElementById('pdfItems');
        pdfItems.innerHTML = '';
        
        if (pdfFiles.length === 0) {
            pdfItems.innerHTML = '<p>No hay PDFs disponibles</p>';
            return;
        }
        
        pdfFiles.forEach(filename => {
            const pdfElement = document.createElement('div');
            pdfElement.className = 'pdf-item';
            pdfElement.innerHTML = `
                <div class="pdf-item-name">📄 ${filename}</div>
                <div class="pdf-item-actions">
                    <button class="download-btn" onclick="downloadPDF('${filename}')">Descargar</button>
                    <button class="delete-btn" onclick="deletePDF('${filename}')">Eliminar</button>
                </div>
            `;
            pdfItems.appendChild(pdfElement);
        });
    }
    
    // Función para descargar PDF
    window.downloadPDF = function(filename) {
        window.open(`http://localhost:3000/pdfs/${filename}`, '_blank');
    };
    
    // Función para eliminar PDF
    window.deletePDF = async function(filename) {
        if (confirm(`¿Está seguro de que desea eliminar "${filename}"?`)) {
            try {
                const response = await fetch(`http://localhost:3000/api/pdfs/${filename}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('PDF eliminado exitosamente');
                    loadPDFs();
                } else {
                    throw new Error('Error al eliminar');
                }
            } catch (error) {
                console.error('Error al eliminar PDF:', error);
                alert('Error al eliminar el PDF. Por favor, intente nuevamente.');
            }
        }
    };
    
    // Función para insertar enlace de PDF
    window.insertPdfLink = function(fieldId) {
        const textarea = document.getElementById(fieldId);
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        // Crear un modal simple para seleccionar el PDF
        const pdfName = prompt('Ingrese el nombre del archivo PDF (ej: programa_informatica.pdf):');
        if (pdfName) {
            const linkText = prompt('Ingrese el texto del enlace (ej: Descargar Programa):', 'Descargar PDF');
            if (linkText) {
                const pdfLink = `[${linkText}](pdf:${pdfName})`;
                textarea.value = text.substring(0, start) + pdfLink + text.substring(end);
                textarea.focus();
                textarea.setSelectionRange(start + pdfLink.length, start + pdfLink.length);
            }
        }
    };

    function updateCurrentAgentLabel() {
        const label = document.getElementById('currentAgentLabel');
        if (!currentAgentFile) {
            label.textContent = '';
            return;
        }
        const pretty = currentAgentFile.replace('qa_', '').replace('.json', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        label.textContent = `Agente actual: ${pretty}`;
    }

    async function loadAgentList() {
        try {
            const response = await fetch('http://localhost:3000/api/agents');
            agentFiles = await response.json();
            agentSelector.innerHTML = '';
            agentFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.replace('qa_', '').replace('.json', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                agentSelector.appendChild(option);
            });
            currentAgentFile = agentFiles[0];
            updateCurrentAgentLabel();
            // Cargar los datos después de inicializar currentAgentFile
            await loadQAData();
        } catch (error) {
            console.error('Error al cargar la lista de agentes:', error);
            alert('Error al cargar la lista de agentes.');
        }
    }

    agentSelector.addEventListener('change', () => {
        currentAgentFile = agentSelector.value;
        updateCurrentAgentLabel();
        loadQAData();
    });

    async function loadSimilarityThreshold() {
        try {
            const response = await fetch('http://localhost:3000/api/config');
            const data = await response.json();
            if (data.similarityThreshold !== undefined) {
                similarityInput.value = Math.round(data.similarityThreshold * 100);
            }
        } catch (e) {
            similarityInput.value = 60;
        }
    }

    saveThresholdBtn.addEventListener('click', async () => {
        const value = parseInt(similarityInput.value, 10);
        if (isNaN(value) || value < 0 || value > 100) {
            alert('El umbral debe ser un número entre 0 y 100');
            return;
        }
        try {
            const response = await fetch('http://localhost:3000/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ similarityThreshold: value / 100 })
            });
            if (response.ok) {
                alert('Umbral de similitud actualizado');
            } else {
                alert('Error al guardar el umbral');
            }
        } catch (e) {
            alert('Error al guardar el umbral');
        }
    });
}); 