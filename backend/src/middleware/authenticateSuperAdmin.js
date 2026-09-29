const { verifyAccessToken } = require("../utils/jwt");

// Autenticacao separada para o painel administrativo master da plataforma.
// Nunca compartilha escopo com req.user de oficinas comuns.
function authenticateSuperAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de acesso ausente." });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyAccessToken(token);
    if (!payload.superAdminId) {
      return res.status(403).json({ erro: "Este token nao e valido para o painel master." });
    }
    req.superAdmin = { id: payload.superAdminId };
    return next();
  } catch (err) {
    return res.status(401).json({ erro: "Token invalido ou expirado." });
  }
}

module.exports = authenticateSuperAdmin;
