// Worker: toma solicitudes de la cola de Redis y las procesa.
// Se ejecuta como un servicio aparte: `node src/worker.js`
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const conectarDB = require('./config/db');
const { crearRedis, conectarRedis, obtenerRedis, redisListo } = require('./config/redis');
const Solicitud = require('./models/Solicitud');
const { COLA, EN_PROCESO, registrarLatido } = require('./services/cola.service');
const { generarRespuesta } = require('./services/reglas.service');
const { invalidarSolicitud } = require('./services/cache.service');

const DELAY_MS = Number(process.env.WORKER_DELAY_MS || 3000);   // tiempo simulado de procesamiento
const POLL_SEG = Number(process.env.WORKER_POLL_SECONDS || 5);  // espera máxima por una tarea antes de revisar pendientes
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let corriendo = true;
let ocupado = false;

async function procesar(id) {
  const s = await Solicitud.findOneAndUpdate(
    { _id: id, estado: { $in: ['EN_COLA', 'PENDIENTE'] } },
    { estado: 'PROCESANDO' },
    { new: true }
  );
  if (!s) return console.warn(`[worker] ${id} no existe o ya fue procesada`);
  await invalidarSolicitud(id); // la caché no debe seguir mostrando el estado anterior

  try {
    await esperar(DELAY_MS);
    const r = generarRespuesta(s);
    await Solicitud.updateOne(
      { _id: id },
      {
        estado: 'RESPONDIDA',
        respuesta: r.respuesta,
        areaResponsable: r.areaResponsable,
        reglaAplicada: r.reglaAplicada,
        tiempoEstimadoHoras: r.tiempoEstimadoHoras,
        mensajeError: null,
        fechaProcesamiento: new Date(),
      }
    );
    console.log(`[worker] ${id} -> RESPONDIDA (${r.reglaAplicada})`);
  } catch (error) {
    await Solicitud.updateOne(
      { _id: id },
      { estado: 'ERROR', mensajeError: error.message, fechaProcesamiento: new Date() }
    );
    console.error(`[worker] ${id} -> ERROR: ${error.message}`);
  }
  await invalidarSolicitud(id);
}

// Solicitudes PENDIENTE: se guardaron en Mongo pero no entraron a la cola (Redis estaba caído).
async function reencolarPendientes() {
  if (!redisListo()) return 0;
  const pendientes = await Solicitud.find({ estado: 'PENDIENTE' }).select('_id');
  let n = 0;
  for (const p of pendientes) {
    const r = await Solicitud.updateOne({ _id: p._id, estado: 'PENDIENTE' }, { estado: 'EN_COLA' });
    if (r.modifiedCount) {
      await obtenerRedis().lpush(COLA, String(p._id));
      await invalidarSolicitud(p._id);
      n++;
    }
  }
  if (n) console.log(`[worker] Reencoladas ${n} solicitudes pendientes`);
  return n;
}

// Tareas que quedaron a medias (el worker se cayó): vuelven a la cola y a estado EN_COLA.
async function recuperarEnProceso() {
  const redis = obtenerRedis();
  let n = 0;
  let id;
  while ((id = await redis.lmove(EN_PROCESO, COLA, 'RIGHT', 'LEFT'))) {
    await Solicitud.updateOne({ _id: id, estado: 'PROCESANDO' }, { estado: 'EN_COLA' });
    await invalidarSolicitud(id);
    n++;
  }
  if (n) console.log(`[worker] Recuperadas ${n} solicitudes que estaban en proceso`);
  return n;
}

async function iniciar() {
  await conectarDB();
  conectarRedis(); // conexión normal: caché, latido y reencolado
  const bloqueante = crearRedis('worker-cola'); // conexión exclusiva para BLMOVE (bloquea mientras espera)

  // Esperar a que Redis responda antes de recuperar
  while (corriendo && !redisListo()) await esperar(500);
  await recuperarEnProceso();
  await reencolarPendientes();

  await registrarLatido().catch(() => {});
  setInterval(() => registrarLatido().catch(() => {}), 10000).unref();
  console.log('[worker] Esperando solicitudes…');

  while (corriendo) {
    try {
      const id = await bloqueante.blmove(COLA, EN_PROCESO, 'RIGHT', 'LEFT', POLL_SEG); // la más antigua primero
      if (!id) {
        await reencolarPendientes(); // sin trabajo: aprovecha para recoger las que no pudieron encolarse
        continue;
      }
      ocupado = true;
      await procesar(id);
      await bloqueante.lrem(EN_PROCESO, 1, id); // solo se retira si terminó (RESPONDIDA o ERROR)
      ocupado = false;
    } catch (error) {
      ocupado = false;
      console.error('[worker] Error en el ciclo:', error.message);
      await esperar(2000);
      // Si falló algo de infraestructura, lo que quedó en EN_PROCESO vuelve a la cola
      try { await recuperarEnProceso(); } catch { /* se reintenta en el siguiente ciclo */ }
    }
  }
  bloqueante.disconnect();
  process.exit(0);
}

// Al detenerse: si está esperando trabajo sale ya; si está procesando, termina esa solicitud primero.
const detener = () => { corriendo = false; if (!ocupado) process.exit(0); };
process.on('SIGTERM', detener);
process.on('SIGINT', detener);
iniciar();
