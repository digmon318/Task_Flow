const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudes.controller');

router.post('/', solicitudesController.crear);
router.get('/', solicitudesController.listar);
router.get('/:id', solicitudesController.obtenerDetalle);
router.get('/:id/respuesta', solicitudesController.obtenerRespuesta);

module.exports = router;
