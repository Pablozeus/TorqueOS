const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const ctrl = require("../controllers/assinatura.controller");

const router = express.Router();
router.use(authenticate);
router.use(authorize("ADMIN")); // so o dono/administrador da oficina mexe na assinatura

router.get("/", ctrl.obter);
router.post("/assinar", ctrl.assinar);
router.post("/cancelar", ctrl.cancelar);

module.exports = router;
