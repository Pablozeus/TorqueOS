const express = require("express");
const authenticateSuperAdmin = require("../middleware/authenticateSuperAdmin");
const { authLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/master.controller");

const router = express.Router();

router.post("/login", authLimiter, ctrl.login);
router.get("/oficinas", authenticateSuperAdmin, ctrl.listarOficinas);
router.patch("/oficinas/:id/status", authenticateSuperAdmin, ctrl.alterarStatusOficina);
router.get("/metricas", authenticateSuperAdmin, ctrl.metricas);
router.get("/planos", authenticateSuperAdmin, ctrl.listarPlanos);

module.exports = router;
