const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/financeiro.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN", "GERENTE", "ATENDENTE")); // Mecanico nao acessa esta area

router.get("/receber", ctrl.listarReceber);
router.post("/receber", ctrl.criarReceber);
router.patch("/receber/:id/pagar", ctrl.marcarComoPagoReceber);
router.post("/receber/:id/cobrar", ctrl.cobrarReceberPorWhatsapp);

router.get("/pagar", ctrl.listarPagar);
router.post("/pagar", ctrl.criarPagar);
router.patch("/pagar/:id/pagar", ctrl.marcarComoPagoPagar);

router.get("/indicadores", ctrl.indicadores);
router.get("/relatorio-anual", ctrl.relatorioAnual);

module.exports = router;
