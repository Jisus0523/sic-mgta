const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos la conexion de la base de datos para que se pueda inicializar
const db = require('./config/db');

const app = express();

// Middlewares básicos
app.use(cors()); // Permite peticiones desde tu frontend en React
app.use(express.json()); // Permite a Express entender el formato JSON

//Ruta de la prueba
app.get('/', (req, res) => {
    res.send('API de SIC Mgta funcionando correctamente');
});

// ENcender el Servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});