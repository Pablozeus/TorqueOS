const prisma = require("../lib/prisma");

// Registra uma acao no log de auditoria da oficina. Nunca deve lancar erro
// que interrompa a requisicao principal — falha de auditoria e silenciosa
// (mas logada no console) para nao derrubar a operacao do usuario.
async function registrarAuditoria({ oficinaId, usuarioId, acao, entidade, entidadeId, detalhes, ip }) {
  try {
    await prisma.auditLog.create({
      data: { oficinaId, usuarioId, acao, entidade, entidadeId, detalhes, ip },
    });
  } catch (err) {
    console.error("Falha ao registrar auditoria:", err.message);
  }
}

module.exports = { registrarAuditoria };
