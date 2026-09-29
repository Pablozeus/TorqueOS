const { z } = require("zod");
const prisma = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../utils/password");
const { signSuperAdminToken } = require("../utils/jwt");

const loginSchema = z.object({ email: z.string().email(), senha: z.string().min(1) });

// POST /api/master/login
async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const superAdmin = await prisma.superAdmin.findUnique({ where: { email: data.email } });
    if (!superAdmin) return res.status(401).json({ erro: "Credenciais invalidas." });

    const ok = await comparePassword(data.senha, superAdmin.senhaHash);
    if (!ok) return res.status(401).json({ erro: "Credenciais invalidas." });

    const token = signSuperAdminToken({ superAdminId: superAdmin.id });
    return res.json({ accessToken: token, superAdmin: { id: superAdmin.id, nome: superAdmin.nome, email: superAdmin.email } });
  } catch (err) {
    return next(err);
  }
}

// GET /api/master/oficinas — visao geral de todas as oficinas da plataforma
async function listarOficinas(req, res, next) {
  try {
    const oficinas = await prisma.oficina.findMany({
      include: {
        assinatura: { include: { plano: true } },
        _count: { select: { usuarios: true, clientes: true, ordens: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(oficinas);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/master/oficinas/:id/status  { status: "ATIVA" | "BLOQUEADA" | "CANCELADA" }
async function alterarStatusOficina(req, res, next) {
  try {
    const { status } = req.body;
    if (!["TESTE", "ATIVA", "BLOQUEADA", "CANCELADA"].includes(status)) {
      return res.status(400).json({ erro: "Status invalido." });
    }
    const oficina = await prisma.oficina.update({ where: { id: req.params.id }, data: { status } });
    return res.json(oficina);
  } catch (err) {
    return next(err);
  }
}

// GET /api/master/metricas — visao geral de faturamento e uso da plataforma
async function metricas(req, res, next) {
  try {
    const [totalOficinas, oficinasAtivas, oficinasTeste, oficinasBloqueadas, assinaturas] = await Promise.all([
      prisma.oficina.count(),
      prisma.oficina.count({ where: { status: "ATIVA" } }),
      prisma.oficina.count({ where: { status: "TESTE" } }),
      prisma.oficina.count({ where: { status: "BLOQUEADA" } }),
      prisma.assinatura.findMany({ where: { status: "ATIVA" }, include: { plano: true } }),
    ]);

    const mrr = assinaturas.reduce((acc, a) => acc + Number(a.plano.precoMensal), 0);

    return res.json({ totalOficinas, oficinasAtivas, oficinasTeste, oficinasBloqueadas, mrr });
  } catch (err) {
    return next(err);
  }
}

async function listarPlanos(req, res, next) {
  try {
    const planos = await prisma.plano.findMany({ orderBy: { precoMensal: "asc" } });
    return res.json(planos);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, listarOficinas, alterarStatusOficina, metricas, listarPlanos };
