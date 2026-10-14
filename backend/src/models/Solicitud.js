const mongoose = require('mongoose');

const ESTADOS = ['PENDIENTE', 'EN_COLA', 'PROCESANDO', 'RESPONDIDA', 'ERROR'];
const CATEGORIAS = ['Información', 'Soporte', 'Documento', 'Consulta', 'Actualización'];
const PRIORIDADES = ['Baja', 'Media', 'Alta'];

const solicitudSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    descripcion: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    categoria: { type: String, required: true, enum: CATEGORIAS },
    prioridad: { type: String, required: true, enum: PRIORIDADES },
    estado: { type: String, enum: ESTADOS, default: 'PENDIENTE', index: true },
    respuesta: { type: String, default: null },
    // Datos que deja el motor de reglas al generar la respuesta
    areaResponsable: { type: String, default: null },
    reglaAplicada: { type: String, default: null },
    tiempoEstimadoHoras: { type: Number, default: null },
    mensajeError: { type: String, default: null },
    fechaCreacion: { type: Date, default: Date.now, index: true },
    fechaProcesamiento: { type: Date, default: null },
  },
  {
    versionKey: false,
    // Colección donde viven las solicitudes (cámbiala con MONGO_COLLECTION en .env)
    collection: process.env.MONGO_COLLECTION || 'solicitudes',
  }
);

module.exports = mongoose.model('Solicitud', solicitudSchema);
module.exports.ESTADOS = ESTADOS;
module.exports.CATEGORIAS = CATEGORIAS;
module.exports.PRIORIDADES = PRIORIDADES;
