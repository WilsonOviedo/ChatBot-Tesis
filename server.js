const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const fsSync = require('fs');

const app = express();
const PORT = 3000;

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'pdfs/');
    },
    filename: function (req, file, cb) {
        // Mantener el nombre original del archivo
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Solo permitir PDFs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Servir archivos estáticos
app.use('/pdfs', express.static('pdfs'));

// --- NUEVA LÓGICA DE INTERPRETACIÓN Y AGENTES ---

// Función para interpretar la pregunta y decidir el agente
function interpretarCarrera(pregunta) {
    const lower = pregunta.toLowerCase();
    if (lower.includes('informática') || lower.includes('informatica')) {
        return 'ingenieria_informatica';
    }
    if (lower.includes('arquitectura')) {
        return 'arquitectura';
    }
    // Aquí puedes agregar más carreras
    return 'general';
}

let SIMILARITY_THRESHOLD = 0.6; // Valor por defecto
const CONFIG_FILE = 'data/config.json';

// Cargar el umbral desde archivo de configuración si existe
async function loadConfig() {
    try {
        const configData = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        if (config.similarityThreshold !== undefined) {
            SIMILARITY_THRESHOLD = config.similarityThreshold;
        }
    } catch (e) {
        // Si no existe el archivo, usar el valor por defecto
    }
}
loadConfig();

// Función para calcular similitud (Jaccard simple)
function similarity(a, b) {
    const normalize = s => s.normalize('NFD').replace(/[^\w\s]/g, '').toLowerCase();
    const setA = new Set(normalize(a).split(/\s+/));
    const setB = new Set(normalize(b).split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
}

// Endpoint para obtener y modificar el umbral desde el admin
app.get('/api/config', async (req, res) => {
    try {
        await loadConfig();
        res.json({ similarityThreshold: SIMILARITY_THRESHOLD });
    } catch (e) {
        res.json({ similarityThreshold: SIMILARITY_THRESHOLD });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const { similarityThreshold } = req.body;
        if (typeof similarityThreshold === 'number' && similarityThreshold >= 0 && similarityThreshold <= 1) {
            SIMILARITY_THRESHOLD = similarityThreshold;
            await fs.writeFile(CONFIG_FILE, JSON.stringify({ similarityThreshold }, null, 4));
            res.json({ message: 'Umbral actualizado', similarityThreshold });
        } else {
            res.status(400).json({ error: 'El umbral debe ser un número entre 0 y 1' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Error al guardar el umbral' });
    }
});

// Ruta para obtener la respuesta según la interpretación
app.post('/api/qa', async (req, res) => {
    try {
        const { question, context } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Falta la pregunta' });
        }
        // Detectar si la pregunta menciona una carrera
        const carreraDetectada = interpretarCarrera(question);
        let agente = carreraDetectada;
        let nuevoContexto = null;
        // Si la pregunta es general, pero hay contexto previo, usar ese contexto
        if (carreraDetectada === 'general' && context && context !== 'general') {
            agente = context;
            nuevoContexto = context;
        } else if (carreraDetectada !== 'general') {
            nuevoContexto = carreraDetectada;
        }
        let data;
        if (agente === 'ingenieria_informatica') {
            data = await fs.readFile('data/qa_ingenieria_informatica.json', 'utf8');
        } else if (agente === 'arquitectura') {
            data = await fs.readFile('data/qa_arquitectura.json', 'utf8');
        } else {
            data = await fs.readFile('data/qa_general.json', 'utf8');
        }
        const qaData = JSON.parse(data);
        const systemPrompt = qaData.systemPrompt || '';
        
        // Buscar primero en los ejemplos existentes para saludos
        const ejemploSaludo = qaData.examples.find(e => {
            const preguntaLower = question.toLowerCase().trim();
            const ejemploLower = e.question.toLowerCase().trim();
            
            // Buscar coincidencias exactas o similares para saludos
            return preguntaLower === ejemploLower || 
                   (preguntaLower.includes('hola') && ejemploLower.includes('hola')) ||
                   (preguntaLower.includes('buenos') && ejemploLower.includes('buenos')) ||
                   (preguntaLower.includes('buenas') && ejemploLower.includes('buenas')) ||
                   (preguntaLower.includes('saludos') && ejemploLower.includes('saludos'));
        });
        
        if (ejemploSaludo) {
            return res.json({ answer: ejemploSaludo.answer, context: nuevoContexto });
        }
        
        // Validar si la pregunta es apropiada para este contexto según el system prompt
        let preguntaApropiada = true;
        let respuestaContextualizada = '';
        
        if (systemPrompt) {
            // Si el system prompt indica que solo debe responder sobre ciertos temas
            if (systemPrompt.toLowerCase().includes('solo') || systemPrompt.toLowerCase().includes('únicamente')) {
                // Extraer palabras clave del system prompt para validar
                const promptLower = systemPrompt.toLowerCase();
                
                // Para el agente de informática
                if (agente === 'ingenieria_informatica' && !question.toLowerCase().includes('informática') && !question.toLowerCase().includes('informatica')) {
                    preguntaApropiada = false;
                    respuestaContextualizada = 'Solo puedo responder preguntas sobre la carrera de Ingeniería en Informática. Si tienes preguntas sobre esta carrera, estaré encantado de ayudarte.';
                }
                // Para el agente de arquitectura
                else if (agente === 'arquitectura' && !question.toLowerCase().includes('arquitectura')) {
                    preguntaApropiada = false;
                    respuestaContextualizada = 'Solo puedo responder preguntas sobre la carrera de Arquitectura. Si tienes preguntas sobre esta carrera, estaré encantado de ayudarte.';
                }
                // Para el agente general
                else if (agente === 'general' && (question.toLowerCase().includes('informática') || question.toLowerCase().includes('informatica') || question.toLowerCase().includes('arquitectura'))) {
                    preguntaApropiada = false;
                    respuestaContextualizada = 'Solo puedo responder preguntas generales institucionales. Para preguntas específicas sobre carreras, te sugiero consultar directamente con el departamento correspondiente.';
                }
            }
        }
        
        // Si la pregunta no es apropiada, devolver la respuesta contextualizada
        if (!preguntaApropiada) {
            return res.json({ answer: respuestaContextualizada, context: nuevoContexto });
        }
        
        // Coincidencia exacta
        let ejemplo = qaData.examples.find(e => e.question.toLowerCase() === question.toLowerCase());
        // Coincidencia parcial (palabras clave)
        if (!ejemplo) {
            const normalize = s => s.normalize('NFD').replace(/[ -]/g, '').toLowerCase();
            const userWords = normalize(question).split(/\s+/);
            ejemplo = qaData.examples.find(e => {
                const qWords = normalize(e.question).split(/\s+/);
                // Al menos 2 palabras clave en común
                const common = userWords.filter(w => qWords.includes(w));
                return common.length >= 2;
            });
        }
        // Coincidencia por inclusión de frase
        if (!ejemplo) {
            ejemplo = qaData.examples.find(e => question.toLowerCase().includes(e.question.toLowerCase()) || e.question.toLowerCase().includes(question.toLowerCase()));
        }
        // Coincidencia por similitud >= umbral
        if (!ejemplo) {
            const similares = qaData.examples
                .map(e => ({ ...e, sim: similarity(question, e.question) }))
                .filter(e => e.sim >= SIMILARITY_THRESHOLD)
                .sort((a, b) => b.sim - a.sim);
            if (similares.length > 0) {
                // Devuelve solo la respuesta más probable
                return res.json({ answer: similares[0].answer, context: nuevoContexto });
            }
        }
        if (ejemplo) {
            return res.json({ answer: ejemplo.answer, context: nuevoContexto });
        } else {
            // Detectar si es un saludo no encontrado en ejemplos
            const preguntaLower = question.toLowerCase().trim();
            const palabrasSaludo = ['hola', 'buenos', 'buenas', 'saludos', 'hey', 'hi', 'hello', 'como estas', 'que tal'];
            const esSaludo = palabrasSaludo.some(palabra => preguntaLower.includes(palabra));
            
            if (esSaludo) {
                // Responder con cordialidad según el contexto
                if (agente === 'ingenieria_informatica') {
                    return res.json({ 
                        answer: '¡Hola! Soy tu asistente virtual especializado en la carrera de Ingeniería en Informática. ¿En qué puedo ayudarte hoy?', 
                        context: nuevoContexto 
                    });
                } else if (agente === 'arquitectura') {
                    return res.json({ 
                        answer: '¡Hola! Soy tu asistente virtual especializado en la carrera de Arquitectura. ¿En qué puedo ayudarte hoy?', 
                        context: nuevoContexto 
                    });
                } else {
                    return res.json({ 
                        answer: '¡Hola! Soy tu asistente virtual de la institución. ¿En qué puedo ayudarte hoy?', 
                        context: nuevoContexto 
                    });
                }
            }
            
            // Si no hay coincidencias, devolver respuesta apropiada según el contexto
            if (agente === 'ingenieria_informatica') {
                return res.json({ 
                    answer: 'Lo siento, no tengo una respuesta específica para esa pregunta. Solo puedo ayudarte con información sobre la carrera de Ingeniería en Informática.', 
                    context: nuevoContexto 
                });
            } else if (agente === 'arquitectura') {
                return res.json({ 
                    answer: 'Lo siento, no tengo una respuesta específica para esa pregunta. Solo puedo ayudarte con información sobre la carrera de Arquitectura.', 
                    context: nuevoContexto 
                });
            } else {
                return res.json({ 
                    answer: 'Lo siento, no tengo una respuesta específica para esa pregunta. Puedo ayudarte con información general institucional.', 
                    context: nuevoContexto 
                });
            }
        }
    } catch (error) {
        console.error('Error al procesar la pregunta:', error);
        res.status(500).json({ error: 'Error al procesar la pregunta' });
    }
});

// Nuevo endpoint para guardar el archivo completo del agente (admin)
app.post('/api/qa-file', async (req, res) => {
    try {
        const agent = req.query.agent || 'qa_general.json';
        const data = req.body;
        console.log('Intentando guardar en:', `data/${agent}`);
        console.log('Datos recibidos:', JSON.stringify(data));
        await fs.writeFile(`data/${agent}`, JSON.stringify(data, null, 4));
        res.json({ message: 'Datos guardados exitosamente' });
    } catch (error) {
        console.error('Error al guardar el archivo:', error);
        res.status(500).json({ error: 'Error al guardar los datos', details: error.message });
    }
});

// --- FIN NUEVA LÓGICA ---

// Ruta para subir PDFs
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }
        
        res.json({ 
            message: 'PDF subido exitosamente',
            filename: req.file.originalname,
            path: `/pdfs/${req.file.originalname}`
        });
    } catch (error) {
        console.error('Error al subir PDF:', error);
        res.status(500).json({ error: 'Error al subir el PDF' });
    }
});

// Ruta para obtener lista de PDFs
app.get('/api/pdfs', async (req, res) => {
    try {
        const files = await fs.readdir('pdfs/');
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        res.json(pdfFiles);
    } catch (error) {
        console.error('Error al leer PDFs:', error);
        res.status(500).json({ error: 'Error al leer los PDFs' });
    }
});

// Ruta para eliminar PDFs
app.delete('/api/pdfs/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join('pdfs', filename);
        
        await fs.unlink(filepath);
        res.json({ message: 'PDF eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar PDF:', error);
        res.status(500).json({ error: 'Error al eliminar el PDF' });
    }
});

// Endpoint para listar agentes
app.get('/api/agents', (req, res) => {
    try {
        const files = fsSync.readdirSync('data');
        const agentFiles = files.filter(f => f.startsWith('qa_') && f.endsWith('.json'));
        res.json(agentFiles);
    } catch (error) {
        console.error('Error al listar agentes:', error);
        res.status(500).json({ error: 'Error al listar agentes' });
    }
});

// Modificar /api/qa para aceptar parámetro de agente
app.get('/api/qa', async (req, res) => {
    try {
        const agent = req.query.agent || 'qa_general.json';
        console.log('Intentando leer archivo:', `data/${agent}`);
        const data = await fs.readFile(`data/${agent}`, 'utf8');
        console.log('Archivo leído exitosamente');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error al leer el archivo:', error);
        res.status(500).json({ error: 'Error al leer los datos', details: error.message });
    }
});

app.post('/api/qa-admin', async (req, res) => {
    try {
        const agent = req.query.agent || 'qa_general.json';
        console.log('POST /api/qa-admin - Agent:', agent);
        console.log('Headers:', req.headers);
        console.log('Body type:', typeof req.body);
        console.log('Body:', req.body);
        
        if (!req.body) {
            console.error('Body es null o undefined');
            return res.status(400).json({ error: 'Body es null o undefined' });
        }
        
        if (typeof req.body === 'string') {
            try {
                req.body = JSON.parse(req.body);
            } catch (parseError) {
                console.error('Error al parsear JSON:', parseError);
                return res.status(400).json({ error: 'JSON inválido' });
            }
        }
        
        if (Object.keys(req.body).length === 0) {
            console.error('Body vacío');
            return res.status(400).json({ error: 'Body vacío' });
        }
        
        const data = req.body;
        console.log('Intentando guardar en:', `data/${agent}`);
        console.log('Datos recibidos:', JSON.stringify(data));
        await fs.writeFile(`data/${agent}`, JSON.stringify(data, null, 4));
        console.log('Archivo guardado exitosamente');
        res.json({ message: 'Datos guardados exitosamente' });
    } catch (error) {
        console.error('Error al guardar el archivo:', error);
        res.status(500).json({ error: 'Error al guardar los datos', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 