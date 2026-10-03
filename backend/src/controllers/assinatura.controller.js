const { z } = require("zod");
const prisma = require("../lib/prisma");
const asaas = require("../services/asaas");
const { registrarAuditoria } = require("../middleware/auditLog");

// GET /api/assinatura
// Retorna a assinatura atual da oficina, o plano contratado e dados basicos
// para a tela de "Minha Assinatura".
async function obter(req, res, next) {
  try {
    const oficina = await prisma.oficina.findUnique({
      where: { id: req.user.oficinaId },
      select: { id: true, nome: true, cnpj: true, telefone: true, email: true, status: true, trialEndsAt: true },
    });

    const assinatura = await prisma.assinatura.findUnique({
      where: { oficinaId: req.user.oficinaId },
      include: { plano: true },
    });

    const planos = await prisma.plano.findMany({ orderBy: { precoMensal: "asc" } });

    return res.json({ oficina, assinatura, planos });
  } catch (err) {
    return next(err);
  }
}

const assinarSchema = z.object({
  planoId: z.string(),
  cnpj: z.string().min(11, "Informe um CPF ou CNPJ valido."),
  telefone: z.string().min(8, "Informe um telefone valido."),
  diaVencimento: z.coerce.number().int().min(1).max(28).default(10),
});

// POST /api/assinatura/assinar
// Cria (ou atualiza) o cliente no Asaas e abre uma assinatura recorrente
// cobrada por boleto. O Asaas envia o primeiro boleto por e-mail sozinho.
async function assinar(req, res, next) {
  try {
    const data = assinarSchema.parse(req.body);
    const oficinaId = req.user.oficinaId;

    const [oficina, plano] = await Promise.all([
      prisma.oficina.findUnique({ where: { id: oficinaId } }),
      prisma.plano.findUnique({ where: { id: data.planoId } }),
    ]);
    if (!plano) return res.status(400).json({ erro: "Plano nao encontrado." });

    // Guarda CNPJ/telefone atualizados na oficina — o Asaas exige documento
    // valido para emitir boleto.
    await prisma.oficina.update({ where: { id: oficinaId }, data: { cnpj: data.cnpj, telefone: data.telefone } });

    let asaasCustomerId = oficina.asaasCustomerId;
    if (!asaasCustomerId) {
      const cliente = await asaas.criarOuBuscarCliente({
        nome: oficina.nome,
        email: oficina.email,
        cpfCnpj: data.cnpj,
        telefone: data.telefone,
      });
      asaasCustomerId = cliente.id;
      await prisma.oficina.update({ where: { id: oficinaId }, data: { asaasCustomerId } });
    }

    const assinaturaAsaas = await asaas.criarAssinaturaBoleto({
      customerId: asaasCustomerId,
      valor: Number(plano.precoMensal),
      descricao: `AUTOMEVO — Plano ${plano.nome}`,
      diaVencimento: data.diaVencimento,
    });

    const assinatura = await prisma.assinatura.upsert({
      where: { oficinaId },
      update: {
        planoId: plano.id,
        status: "ATIVA",
        provedor: "ASAAS",
        externalId: assinaturaAsaas.id,
        currentPeriodEnd: assinaturaAsaas.nextDueDate ? new Date(assinaturaAsaas.nextDueDate) : null,
      },
      create: {
        oficinaId,
        planoId: plano.id,
        status: "ATIVA",
        provedor: "ASAAS",
        externalId: assinaturaAsaas.id,
        currentPeriodEnd: assinaturaAsaas.nextDueDate ? new Date(assinaturaAsaas.nextDueDate) : null,
      },
      include: { plano: true },
    });

    await prisma.oficina.update({ where: { id: oficinaId }, data: { status: "ATIVA" } });

    await registrarAuditoria({
      oficinaId,
      usuarioId: req.user.id,
      acao: "ASSINOU_PLANO",
      entidade: "Assinatura",
      entidadeId: assinatura.id,
      detalhes: { plano: plano.nome },
      ip: req.ip,
    });

    return res.status(201).json({
      assinatura,
      boletoUrl: assinaturaAsaas.invoiceUrl || null,
      simulado: asaas.MODO_SIMULADO,
    });
  } catch (err) {
    return next(err);
  }
}

// POST /api/assinatura/cancelar
async function cancelar(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;
    const assinatura = await prisma.assinatura.findUnique({ where: { oficinaId } });
    if (!assinatura) return res.status(404).json({ erro: "Nenhuma assinatura ativa encontrada." });

    if (assinatura.externalId) {
      await asaas.cancelarAssinatura(assinatura.externalId);
    }

    const atualizada = await prisma.assinatura.update({
      where: { oficinaId },
      data: { status: "CANCELADA" },
      include: { plano: true },
    });

    await prisma.oficina.update({ where: { id: oficinaId }, data: { status: "CANCELADA" } });

    await registrarAuditoria({
      oficinaId,
      usuarioId: req.user.id,
      acao: "CANCELOU_ASSINATURA",
      entidade: "Assinatura",
      entidadeId: assinatura.id,
      ip: req.ip,
    });

    return res.json(atualizada);
  } catch (err) {
    return next(err);
  }
}

module.exports = { obter, assinar, cancelar };
