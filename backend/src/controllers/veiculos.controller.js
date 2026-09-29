const { z } = require("zod");
const prisma = require("../lib/prisma");

const veiculoSchema = z.object({
  clienteId: z.string(),
  placa: z.string().min(6),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  ano: z.coerce.number().int().optional(),
  cor: z.string().optional(),
  km: z.coerce.number().int().optional(),
  chassi: z.string().optional(),
  renavam: z.string().optional(),
});

async function listar(req, res, next) {
  try {
    const { busca } = req.query;
    const veiculos = await prisma.veiculo.findMany({
      where: {
        oficinaId: req.user.oficinaId,
        ...(busca && {
          OR: [
            { placa: { contains: busca, mode: "insensitive" } },
            { modelo: { contains: busca, mode: "insensitive" } },
          ],
        }),
      },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(veiculos);
  } catch (err) {
    return next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const veiculo = await prisma.veiculo.findFirst({
      where: { id: req.params.id, oficinaId: req.user.oficinaId },
      include: { cliente: true, ordens: { orderBy: { createdAt: "desc" } } },
    });
    if (!veiculo) return res.status(404).json({ erro: "Veiculo nao encontrado." });
    return res.json(veiculo);
  } catch (err) {
    return next(err);
  }
}

async function criar(req, res, next) {
  try {
    const data = veiculoSchema.parse(req.body);

    // garante que o cliente informado pertence a mesma oficina do usuario
    const cliente = await prisma.cliente.findFirst({ where: { id: data.clienteId, oficinaId: req.user.oficinaId } });
    if (!cliente) return res.status(400).json({ erro: "Cliente invalido para esta oficina." });

    const veiculo = await prisma.veiculo.create({ data: { ...data, oficinaId: req.user.oficinaId } });
    return res.status(201).json(veiculo);
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const data = veiculoSchema.partial().parse(req.body);
    const existente = await prisma.veiculo.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Veiculo nao encontrado." });

    const veiculo = await prisma.veiculo.update({ where: { id: req.params.id }, data });
    return res.json(veiculo);
  } catch (err) {
    return next(err);
  }
}

async function remover(req, res, next) {
  try {
    const existente = await prisma.veiculo.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Veiculo nao encontrado." });

    await prisma.veiculo.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
