const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

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

// Ruta para obtener los datos
app.get('/api/qa', async (req, res) => {
    try {
        const data = await fs.readFile('data/qa.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error al leer el archivo:', error);
        res.status(500).json({ error: 'Error al leer los datos' });
    }
});

// Ruta para guardar los datos
app.post('/api/qa', async (req, res) => {
    try {
        const data = req.body;
        await fs.writeFile('data/qa.json', JSON.stringify(data, null, 4));
        res.json({ message: 'Datos guardados exitosamente' });
    } catch (error) {
        console.error('Error al guardar el archivo:', error);
        res.status(500).json({ error: 'Error al guardar los datos' });
    }
});

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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 