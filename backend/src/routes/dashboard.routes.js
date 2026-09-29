const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { resumo, faturamentoMensal } = require("../controllers/dashboard.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN", "GERENTE", "ATENDENTE")); // Mecanico nao acessa esta area

router.get("/", resumo);
router.get("/faturamento-mensal", faturamentoMensal);

module.exports = router;
