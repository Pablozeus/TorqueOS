// Restringe uma rota a determinados perfis de usuario.
// Uso: router.delete("/:id", authenticate, authorize("ADMIN", "GERENTE"), handler)
function authorize(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: "Nao autenticado." });
    }
    if (!perfisPermitidos.includes(req.user.perfil)) {
      return res.status(403).json({ erro: "Voce nao tem permissao para executar esta acao." });
    }
    return next();
  };
}

module.exports = authorize;
