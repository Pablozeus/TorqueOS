const { z } = require("zod");
const prisma = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../utils/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { registrarAuditoria } = require("../middleware/auditLog");
const { enviarCodigoRecuperacao } = require("../services/email");

const signupSchema = z.object({
  oficina: z.string().min(2, "Nome da oficina obrigatorio."),
  nome: z.string().min(2, "Seu nome obrigatorio."),
  email: z.string().email("E-mail invalido."),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const loginSchema = z.object({
  email: z.string().email("E-mail invalido."),
  senha: z.string().min(1, "Informe a senha."),
});

// POST /api/auth/signup
// Cria a Oficina (tenant), o usuario ADMIN dessa oficina e inicia o
// periodo de teste gratis de 7 dias, sem exigir cartao de credito.
async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);

    const emailEmUso = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (emailEmUso) {
      return res.status(409).json({ erro: "Ja existe uma conta com esse e-mail." });
    }

    const senhaHash = await hashPassword(data.senha);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const planoBasico = await prisma.plano.findFirst({ where: { nome: "Profissional" } });

    const resultado = await prisma.$transaction(async (tx) => {
      const oficina = await tx.oficina.create({
        data: {
          nome: data.oficina,
          email: data.email,
          status: "TESTE",
          trialEndsAt,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          oficinaId: oficina.id,
          nome: data.nome,
          email: data.email,
          senhaHash,
          perfil: "ADMIN",
        },
      });

      if (planoBasico) {
        await tx.assinatura.create({
          data: {
            oficinaId: oficina.id,
            planoId: planoBasico.id,
            status: "TRIAL",
            trialEndsAt,
          },
        });
      }

      return { oficina, usuario };
    });

    const payload = {
      usuarioId: resultado.usuario.id,
      oficinaId: resultado.oficina.id,
      perfil: resultado.usuario.perfil,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await registrarAuditoria({
      oficinaId: resultado.oficina.id,
      usuarioId: resultado.usuario.id,
      acao: "CADASTRO_OFICINA",
      entidade: "Oficina",
      entidadeId: resultado.oficina.id,
      ip: req.ip,
    });

    return res.status(201).json({
      accessToken,
      refreshToken,
      oficina: { id: resultado.oficina.id, nome: resultado.oficina.nome, status: resultado.oficina.status, trialEndsAt },
      usuario: { id: resultado.usuario.id, nome: resultado.usuario.nome, email: resultado.usuario.email, cargo: resultado.usuario.cargo, perfil: resultado.usuario.perfil },
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({
      where: { email: data.email },
      include: { oficina: true },
    });

    // Mensagem generica de proposito: nao revelar se o e-mail existe ou nao.
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    const senhaOk = await comparePassword(data.senha, usuario.senhaHash);
    if (!senhaOk) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    if (usuario.oficina.status === "BLOQUEADA" || usuario.oficina.status === "CANCELADA") {
      return res.status(403).json({ erro: "O acesso desta oficina esta suspenso. Fale com o suporte." });
    }

    const payload = { usuarioId: usuario.id, oficinaId: usuario.oficinaId, perfil: usuario.perfil };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await registrarAuditoria({
      oficinaId: usuario.oficinaId,
      usuarioId: usuario.id,
      acao: "LOGIN",
      ip: req.ip,
    });

    return res.json({
      accessToken,
      refreshToken,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, cargo: usuario.cargo, perfil: usuario.perfil },
      oficina: { id: usuario.oficina.id, nome: usuario.oficina.nome, status: usuario.oficina.status },
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ erro: "refreshToken obrigatorio." });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ erro: "Refresh token invalido ou expirado. Faca login novamente." });
    }

    const novoAccessToken = signAccessToken({
      usuarioId: payload.usuarioId,
      oficinaId: payload.oficinaId,
      perfil: payload.perfil,
    });

    return res.json({ accessToken: novoAccessToken });
  } catch (err) {
    return next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id: req.user.id, oficinaId: req.user.oficinaId },
      select: { id: true, nome: true, email: true, cargo: true, perfil: true, oficina: { select: { id: true, nome: true, status: true } } },
    });
    if (!usuario) return res.status(404).json({ erro: "Usuario nao encontrado." });
    return res.json(usuario);
  } catch (err) {
    return next(err);
  }
}

const forgotPasswordSchema = z.object({ email: z.string().email("E-mail invalido.") });

// POST /api/auth/forgot-password
// Gera um codigo de 6 digitos, guarda so o hash dele no banco (expira em 15 min)
// e envia por e-mail. Sempre responde com sucesso, exista ou nao o e-mail —
// isso evita que alguem descubra quais e-mails estao cadastrados na plataforma.
async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (usuario) {
      const codigo = String(Math.floor(100000 + Math.random() * 900000)); // 6 digitos
      const codigoHash = await hashPassword(codigo);
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.$transaction([
        // invalida qualquer codigo anterior ainda pendente desse usuario
        prisma.codigoRecuperacaoSenha.updateMany({
          where: { usuarioId: usuario.id, usado: false },
          data: { usado: true },
        }),
        prisma.codigoRecuperacaoSenha.create({
          data: { usuarioId: usuario.id, codigoHash, expiraEm },
        }),
      ]);

      await enviarCodigoRecuperacao({ para: usuario.email, nome: usuario.nome, codigo });

      await registrarAuditoria({ oficinaId: usuario.oficinaId, usuarioId: usuario.id, acao: "SOLICITOU_RECUPERACAO_SENHA", ip: req.ip });
    }

    return res.json({ mensagem: "Se esse e-mail estiver cadastrado, enviamos um codigo de recuperacao." });
  } catch (err) {
    return next(err);
  }
}

const resetPasswordSchema = z.object({
  email: z.string().email(),
  codigo: z.string().length(6, "O codigo tem 6 digitos."),
  novaSenha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (!usuario) {
      return res.status(400).json({ erro: "Codigo invalido ou expirado." });
    }

    const registro = await prisma.codigoRecuperacaoSenha.findFirst({
      where: { usuarioId: usuario.id, usado: false, expiraEm: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!registro) {
      return res.status(400).json({ erro: "Codigo invalido ou expirado." });
    }

    const codigoOk = await comparePassword(data.codigo, registro.codigoHash);
    if (!codigoOk) {
      return res.status(400).json({ erro: "Codigo invalido ou expirado." });
    }

    const novaSenhaHash = await hashPassword(data.novaSenha);

    await prisma.$transaction([
      prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash: novaSenhaHash } }),
      prisma.codigoRecuperacaoSenha.update({ where: { id: registro.id }, data: { usado: true } }),
    ]);

    await registrarAuditoria({ oficinaId: usuario.oficinaId, usuarioId: usuario.id, acao: "REDEFINIU_SENHA", ip: req.ip });

    return res.json({ mensagem: "Senha redefinida com sucesso." });
  } catch (err) {
    return next(err);
  }
}

module.exports = { signup, login, refresh, me, forgotPassword, resetPassword };
