const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/ordens.controller");

const router = express.Router();
router.use(authenticate);

// Mecanico pode listar e mudar o status apenas das OS atribuidas a ele
// (o filtro por dono acontece dentro do controller). Criar e excluir OS
// ficam restritos a quem organiza o fluxo de trabalho da oficina.
router.get("/", ctrl.listar);
router.get("/:id", ctrl.buscarPorId);
router.post("/", authorize("ADMIN", "GERENTE", "ATENDENTE"), ctrl.criar);
router.patch("/:id/status", ctrl.atualizarStatus);
router.delete("/:id", authorize("ADMIN", "GERENTE", "ATENDENTE"), ctrl.remover);

module.exports = router;
