// Handler central de erros. Mantem mensagens de erro do Prisma e de validacao
// consistentes e nunca vaza detalhes internos (stack trace) em producao.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      erro: "Dados invalidos.",
      detalhes: err.errors.map((e) => ({ campo: e.path.join("."), mensagem: e.message })),
    });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ erro: "Ja existe um registro com esses dados (violacao de unicidade)." });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ erro: "Registro nao encontrado." });
  }

  const status = err.status || 500;
  const mensagem = status === 500 ? "Erro interno do servidor." : err.message;

  return res.status(status).json({ erro: mensagem });
}

module.exports = errorHandler;
