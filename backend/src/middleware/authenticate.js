const { verifyAccessToken } = require("../utils/jwt");

// Exige um usuario autenticado de uma oficina (tenant).
// Anexa req.user = { id, oficinaId, perfil } — toda query subsequente
// nos controllers DEVE filtrar por req.user.oficinaId. Isso e o que garante
// o isolamento multi-tenant: nunca confiar em um oficinaId vindo do body/query.
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token de acesso ausente." });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.usuarioId,
      oficinaId: payload.oficinaId,
      perfil: payload.perfil,
    };

    return next();
  } catch (err) {
    console.error("ERRO JWT:", err);
    return res.status(401).json({ erro: "Token invalido ou expirado." });
  }
}