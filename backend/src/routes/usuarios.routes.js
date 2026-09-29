const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/usuarios.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN", "GERENTE", "ATENDENTE")); // Mecanico nao acessa esta area

router.get("/", ctrl.listar);
router.post("/", ctrl.criar);
router.patch("/:id", ctrl.atualizar);

module.exports = router;
