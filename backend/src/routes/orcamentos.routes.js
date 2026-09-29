const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/orcamentos.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN", "GERENTE", "ATENDENTE")); // Mecanico nao acessa esta area

router.get("/", ctrl.listar);
router.post("/", ctrl.criar);
router.put("/:id", ctrl.atualizar);
router.patch("/:id/status", ctrl.atualizarStatus);
router.post("/:id/converter", ctrl.converterEmOS);
router.delete("/:id", ctrl.remover);

module.exports = router;
