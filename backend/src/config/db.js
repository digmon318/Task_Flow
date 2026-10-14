const mongoose = require('mongoose');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function obtenerUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  if (process.env.IN_DOCKER) {
    console.error('[DB] Falta MONGO_URI: pega tu cadena de conexión de Atlas en el archivo .env');
    process.exit(1);
  }
  console.warn('[DB] MONGO_URI no está definida, se usa MongoDB local. ¿Falta el archivo .env?');
  return 'mongodb://localhost:27017/taskflow'; // solo para desarrollo sin Docker
}

const dbListo = () => mongoose.connection.readyState === 1;

// Reintenta la conexión unas veces antes de rendirse.
async function conectarDB({ intentos = 15, espera = 2000 } = {}) {
  const uri = obtenerUri();
  const uriSegura = uri.replace(/\/\/[^@/]+@/, '//***@'); // no mostrar usuario/clave en logs

  for (let i = 1; i <= intentos; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      console.log(`[DB] Conectado a MongoDB -> ${uriSegura}`);
      mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB desconectado'));
      return;
    } catch (error) {
      console.error(`[DB] Intento ${i}/${intentos} fallido: ${error.message}`);
      if (i === intentos) {
        console.error('[DB] No se pudo conectar. Revisa MONGO_URI (usuario/clave) y que tu IP esté permitida en Atlas > Network Access.');
        process.exit(1);
      }
      await esperar(espera);
    }
  }
}

module.exports = conectarDB;
module.exports.dbListo = dbListo;
