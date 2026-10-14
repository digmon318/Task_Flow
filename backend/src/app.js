const path = require('path');
// Lee backend/.env y, si no existe ahí, el .env de la carpeta raíz (el mismo que usa docker compose)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');

const conectarDB = require('./config/db');
const { conectarRedis, redisListo } = require('./config/redis');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const { workerActivo } = require('./services/cola.service');
const { obtenerMetricas } = require('./services/metricas.service');
const { noEncontrado, manejadorErrores } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ exposedHeaders: ['X-Cache'] }));
app.use(express.json());

// Healthcheck: siempre responde 200 si el proceso vive; el cuerpo indica el estado de cada dependencia.
app.get('/health', async (req, res) => {
  let worker = false;
  try { worker = await workerActivo(); } catch { /* Redis sin respuesta */ }
  res.status(200).json({
    estado: 'ok',
    servicio: 'backend',
    mongo: conectarDB.dbListo() ? 'ok' : 'no disponible',
    redis: redisListo() ? 'ok' : 'no disponible',
    worker: worker ? 'ok' : 'no disponible',
  });
});

// Métricas para el monitor: servicios, tamaño de la cola, solicitudes por estado y caché.
app.get('/metricas', async (req, res, next) => {
  try {
    res.status(200).json(await obtenerMetricas());
  } catch (error) {
    next(error);
  }
});

app.use('/solicitudes', solicitudesRoutes);

app.use(noEncontrado);
app.use(manejadorErrores);

async function iniciar() {
  await conectarDB();
  conectarRedis();
  app.listen(PORT, () => {
    console.log(`[app] Backend TaskFlow escuchando en el puerto ${PORT}`);
  });
}

if (require.main === module) iniciar();

module.exports = app;
