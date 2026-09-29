const { verifyAccessToken } = require("../utils/jwt");

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
    console.error("ERRO JWT:", err.message);
    return res.status(401).json({
      erro: "Token invalido ou expirado.",
    });
  }
}

module.exports = authenticate;