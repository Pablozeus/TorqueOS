const express = require("express");
const { asaasWebhook } = require("../controllers/webhooks.controller");

const router = express.Router();

// Rota publica de proposito (o Asaas chama de servidor pra servidor, sem
// login de usuario) — a autenticidade e validada pelo token no header,
// dentro do controller.
router.post("/asaas", asaasWebhook);

module.exports = router;
