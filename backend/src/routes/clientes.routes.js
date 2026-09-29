const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/clientes.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN", "GERENTE", "ATENDENTE")); // Mecanico nao acessa esta area

router.get("/", ctrl.listar);
router.get("/:id", ctrl.buscarPorId);
router.post("/", ctrl.criar);
router.put("/:id", ctrl.atualizar);
router.delete("/:id", ctrl.remover);

module.exports = router;
