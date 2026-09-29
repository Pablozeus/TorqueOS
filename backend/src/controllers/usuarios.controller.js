const { z } = require("zod");
const prisma = require("../lib/prisma");
const { hashPassword } = require("../utils/password");

const SELECT_PUBLICO = { id: true, nome: true, email: true, cargo: true, perfil: true, ativo: true, createdAt: true };

const criarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  // cargo e texto livre: Mecanico, Mecanico Preparador, Pintor, Funileiro,
  // Ajudante, ou qualquer outra funcao que a oficina use.
  cargo: z.string().optional(),
  // perfil controla o NIVEL DE ACESSO ao sistema, nao o cargo da pessoa:
  // ADMIN/GERENTE/ATENDENTE tem acesso total; MECANICO e o nivel de acesso
  // restrito (so ve as proprias OS) — serve para qualquer funcao de "chao
  // de oficina" (pintor, funileiro, ajudante, mecanico preparador etc).
  perfil: z.enum(["ADMIN", "GERENTE", "ATENDENTE", "MECANICO"]).default("MECANICO"),
});

// GET /api/usuarios
// Lista a equipe da oficina (usada para atribuir o responsavel por uma OS,
// por exemplo). Sempre filtrado por oficinaId — nunca ve gente de outra oficina.
async function listar(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { oficinaId: req.user.oficinaId },
      select: SELECT_PUBLICO,
      orderBy: { nome: "asc" },
    });
    return res.json(usuarios);
  } catch (err) {
    return next(err);
  }
}

// POST /api/usuarios
// Adiciona um novo membro a equipe da propria oficina.
async function criar(req, res, next) {
  try {
    const data = criarUsuarioSchema.parse(req.body);

    const emailEmUso = await prisma.usuario.findUnique({ where: { email: data.email } });
    if (emailEmUso) {
      return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
    }

    const senhaHash = await hashPassword(data.senha);
    const usuario = await prisma.usuario.create({
      data: { oficinaId: req.user.oficinaId, nome: data.nome, email: data.email, senhaHash, cargo: data.cargo || null, perfil: data.perfil },
      select: SELECT_PUBLICO,
    });

    return res.status(201).json(usuario);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/usuarios/:id  { ativo, perfil, cargo }
// Atualiza dados de um membro da equipe. Desativar (ativo: false) nao
// deleta, so tira o acesso e some das listas de atribuicao — preserva o
// historico de OS ja vinculadas a essa pessoa.
async function atualizar(req, res, next) {
  try {
    const { ativo, perfil, cargo } = req.body;
    const existente = await prisma.usuario.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Membro da equipe não encontrado." });

    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: {
        ...(typeof ativo === "boolean" && { ativo }),
        ...(perfil && { perfil }),
        ...(cargo !== undefined && { cargo: cargo || null }),
      },
      select: SELECT_PUBLICO,
    });
    return res.json(usuario);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, criar, atualizar };
