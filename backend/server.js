const express = require('express');
const cors = require('cors');
const {
    obtenerSugerenciasClientes,
    obtenerMaterialesPorCliente,
    buscarMateriales
} = require('./driveService'); // Asegúrate de que el archivo esté correctamente importado

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/sugerencias-clientes', async (req, res) => {
    const query = req.query.q;
    console.log('Solicitud recibida para sugerencias:', query); // Registro de depuración

    if (!query) {
        return res.status(400).send('Falta el parámetro de búsqueda');
    }

    try {
        const sugerencias = await obtenerSugerenciasClientes(query);
        console.log('Sugerencias encontradas:', sugerencias); // Registro de depuración
        res.json(sugerencias);
    } catch (error) {
        console.error('Error al obtener sugerencias de clientes:', error);
        res.status(500).send('Error al obtener sugerencias de clientes');
    }
});

// Ruta para obtener materiales por cliente
app.post('/buscar-materiales', async (req, res) => {
    const { cliente } = req.body;
    if (!cliente) {
        return res.status(400).send('Falta el nombre del cliente');
    }

    try {
        const materiales = await obtenerMaterialesPorCliente(cliente);
        res.json(materiales);
    } catch (error) {
        console.error('Error al buscar materiales por cliente:', error);
        res.status(500).send('Error al buscar materiales por cliente');
    }
});


// Ruta para buscar materiales específicos por cliente y material
app.post('/buscar-material-especifico', async (req, res) => {
    const { cliente, material } = req.body;
    if (!cliente || !material) {
        return res.status(400).send('Falta el nombre del cliente o material');
    }

    try {
        const resultados = await buscarMateriales(cliente, material);
        res.json(resultados);
    } catch (error) {
        console.error('Error al buscar materiales específicos:', error);
        res.status(500).send('Error al buscar materiales específicos');
    }
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
