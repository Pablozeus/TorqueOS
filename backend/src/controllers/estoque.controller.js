const { z } = require("zod");
const prisma = require("../lib/prisma");

const pecaSchema = z.object({
  codigo: z.string().min(1),
  nome: z.string().min(1),
  categoria: z.string().optional(),
  fornecedor: z.string().optional(),
  quantidade: z.coerce.number().int().min(0).default(0),
  estoqueMinimo: z.coerce.number().int().min(0).default(0),
  valorCompra: z.coerce.number().min(0),
  valorVenda: z.coerce.number().min(0),
});

const movimentacaoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  quantidade: z.coerce.number().int().min(1),
  motivo: z.string().optional(),
});

async function listar(req, res, next) {
  try {
    const { busca, baixoEstoque } = req.query;
    const pecas = await prisma.peca.findMany({
      where: {
        oficinaId: req.user.oficinaId,
        ...(busca && {
          OR: [{ nome: { contains: busca, mode: "insensitive" } }, { codigo: { contains: busca, mode: "insensitive" } }],
        }),
      },
      orderBy: { nome: "asc" },
    });
    const resultado = baixoEstoque === "true" ? pecas.filter((p) => p.quantidade <= p.estoqueMinimo) : pecas;
    return res.json(resultado);
  } catch (err) {
    return next(err);
  }
}

async function criar(req, res, next) {
  try {
    const data = pecaSchema.parse(req.body);
    const peca = await prisma.peca.create({ data: { ...data, oficinaId: req.user.oficinaId } });
    return res.status(201).json(peca);
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const data = pecaSchema.partial().parse(req.body);
    const existente = await prisma.peca.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Peca nao encontrada." });

    const peca = await prisma.peca.update({ where: { id: req.params.id }, data });
    return res.json(peca);
  } catch (err) {
    return next(err);
  }
}

// POST /api/estoque/:id/movimentacao — entrada manual de fornecedor ou ajuste de saida
async function registrarMovimentacao(req, res, next) {
  try {
    const data = movimentacaoSchema.parse(req.body);
    const oficinaId = req.user.oficinaId;

    const peca = await prisma.peca.findFirst({ where: { id: req.params.id, oficinaId } });
    if (!peca) return res.status(404).json({ erro: "Peca nao encontrada." });

    if (data.tipo === "SAIDA" && peca.quantidade < data.quantidade) {
      return res.status(400).json({ erro: "Quantidade em estoque insuficiente para essa saida." });
    }

    const [pecaAtualizada] = await prisma.$transaction([
      prisma.peca.update({
        where: { id: peca.id },
        data: { quantidade: { [data.tipo === "ENTRADA" ? "increment" : "decrement"]: data.quantidade } },
      }),
      prisma.movimentacaoEstoque.create({
        data: { oficinaId, pecaId: peca.id, tipo: data.tipo, quantidade: data.quantidade, motivo: data.motivo },
      }),
    ]);

    return res.json(pecaAtualizada);
  } catch (err) {
    return next(err);
  }
}

async function remover(req, res, next) {
  try {
    const existente = await prisma.peca.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Peca nao encontrada." });

    await prisma.peca.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, criar, atualizar, registrarMovimentacao, remover };
