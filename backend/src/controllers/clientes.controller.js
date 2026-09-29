const { z } = require("zod");
const prisma = require("../lib/prisma");

const clienteSchema = z.object({
  nome: z.string().min(2),
  cpfCnpj: z.string().optional(),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
});

// Todas as queries abaixo filtram por req.user.oficinaId — nunca por um
// oficinaId vindo do cliente. Isso e o que impede uma oficina de ler ou
// alterar dados de outra.

async function listar(req, res, next) {
  try {
    const { busca } = req.query;
    const clientes = await prisma.cliente.findMany({
      where: {
        oficinaId: req.user.oficinaId,
        ...(busca && {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca } },
            { cpfCnpj: { contains: busca } },
          ],
        }),
      },
      include: { _count: { select: { veiculos: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(clientes);
  } catch (err) {
    return next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: req.params.id, oficinaId: req.user.oficinaId },
      include: { veiculos: true, ordens: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!cliente) return res.status(404).json({ erro: "Cliente nao encontrado." });
    return res.json(cliente);
  } catch (err) {
    return next(err);
  }
}

async function criar(req, res, next) {
  try {
    const data = clienteSchema.parse(req.body);
    const cliente = await prisma.cliente.create({
      data: { ...data, oficinaId: req.user.oficinaId },
    });
    return res.status(201).json(cliente);
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const data = clienteSchema.partial().parse(req.body);
    const existente = await prisma.cliente.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Cliente nao encontrado." });

    const cliente = await prisma.cliente.update({ where: { id: req.params.id }, data });
    return res.json(cliente);
  } catch (err) {
    return next(err);
  }
}

async function remover(req, res, next) {
  try {
    const existente = await prisma.cliente.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Cliente nao encontrado." });

    await prisma.cliente.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
