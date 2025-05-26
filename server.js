const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Servir archivos estáticos

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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 