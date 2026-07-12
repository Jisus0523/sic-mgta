const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

// Comprobar la conexion
pool.connect()
    .then(() => console.log('🟢 Conexión exitosa a la base de datos de SIC Mgta'))
    .catch((err) => console.error('🔴 Error en la conexión a la base de datos:', err.stack));

    module.exports = pool;