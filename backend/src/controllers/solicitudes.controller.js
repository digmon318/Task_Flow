const solicitudesService = require('../services/solicitudes.service');
const { ESTADOS } = require('../models/Solicitud');

// X-Cache indica si la respuesta salió de Redis (HIT), de MongoDB (MISS) o sin caché (BYPASS).
const conOrigen = (res, origen) => res.set('X-Cache', origen);
const esTexto = (v) => typeof v === 'string';

// POST /solicitudes
async function crear(req, res) {
  try {
    const { titulo, descripcion, categoria, prioridad } = req.body || {};

    if (!titulo || !descripcion || !categoria || !prioridad) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detalle: 'titulo, descripcion, categoria y prioridad son obligatorios',
      });
    }
    // Solo se aceptan textos: evita que lleguen objetos (p. ej. {"$ne": ""}) a MongoDB
    if (![titulo, descripcion, categoria, prioridad].every(esTexto)) {
      return res.status(400).json({ error: 'Datos inválidos', detalle: 'Todos los campos deben ser texto' });
    }

    const solicitud = await solicitudesService.crearSolicitud({ titulo, descripcion, categoria, prioridad });
    return res.status(201).json({ mensaje: 'Solicitud registrada correctamente', solicitud });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Datos inválidos', detalle: error.message });
    }
    console.error('[solicitudes.controller] Error al crear:', error);
    return res.status(500).json({ error: 'Error interno al registrar la solicitud' });
  }
}

// GET /solicitudes?busqueda=&estado=
async function listar(req, res) {
  try {
    const { busqueda, estado } = req.query;
    if ((busqueda !== undefined && !esTexto(busqueda)) || (estado !== undefined && !esTexto(estado))) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido', detalle: `Usa uno de: ${ESTADOS.join(', ')}` });
    }
    const { solicitudes, origen } = await solicitudesService.listarSolicitudes({ busqueda, estado });
    conOrigen(res, origen);
    return res.status(200).json({ total: solicitudes.length, solicitudes });
  } catch (error) {
    console.error('[solicitudes.controller] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno al consultar las solicitudes' });
  }
}

// GET /solicitudes/:id
async function obtenerDetalle(req, res) {
  try {
    const { solicitud, origen } = await solicitudesService.obtenerSolicitudPorId(req.params.id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    conOrigen(res, origen);
    return res.status(200).json({ solicitud });
  } catch (error) {
    console.error('[solicitudes.controller] Error al obtener detalle:', error);
    return res.status(500).json({ error: 'Error interno al consultar la solicitud' });
  }
}

// GET /solicitudes/:id/respuesta
async function obtenerRespuesta(req, res) {
  try {
    const { solicitud, origen } = await solicitudesService.obtenerSolicitudPorId(req.params.id);
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    conOrigen(res, origen);

    if (solicitud.estado !== 'RESPONDIDA') {
      return res.status(200).json({
        estado: solicitud.estado,
        respuesta: null,
        mensaje: 'La solicitud aún no tiene una respuesta generada',
      });
    }
    return res.status(200).json({
      estado: solicitud.estado,
      respuesta: solicitud.respuesta,
      areaResponsable: solicitud.areaResponsable,
      tiempoEstimadoHoras: solicitud.tiempoEstimadoHoras,
    });
  } catch (error) {
    console.error('[solicitudes.controller] Error al obtener respuesta:', error);
    return res.status(500).json({ error: 'Error interno al consultar la respuesta' });
  }
}

module.exports = { crear, listar, obtenerDetalle, obtenerRespuesta };
