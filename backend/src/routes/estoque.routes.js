const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/estoque.controller");

const router = express.Router();
router.use(authenticate);

// Estoque fica aberto a qualquer membro da equipe, incluindo quem tem
// acesso restrito (mecanico, pintor, funileiro, ajudante etc) — assim
// qualquer um pode ver, atualizar quantidade e cadastrar item que faltou.
// So excluir um item continua restrito a quem organiza a oficina.
router.get("/", ctrl.listar);
router.post("/", ctrl.criar);
router.put("/:id", ctrl.atualizar);
router.post("/:id/movimentacao", ctrl.registrarMovimentacao);
router.delete("/:id", authorize("ADMIN", "GERENTE", "ATENDENTE"), ctrl.remover);

module.exports = router;
