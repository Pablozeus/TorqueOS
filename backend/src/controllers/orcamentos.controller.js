const { z } = require("zod");
const prisma = require("../lib/prisma");
const { registrarAuditoria } = require("../middleware/auditLog");
const whatsapp = require("../services/whatsapp");

const itemSchema = z.object({
  tipo: z.enum(["PECA", "MAO_DE_OBRA"]),
  descricao: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).default(1),
  valorUnitario: z.coerce.number().min(0),
});

const orcamentoSchema = z.object({
  clienteId: z.string(),
  veiculoId: z.string(),
  desconto: z.coerce.number().min(0).default(0),
  itens: z.array(itemSchema).min(1, "Adicione pelo menos um item ao orcamento."),
});

async function proximoNumero(oficinaId) {
  const ultimo = await prisma.orcamento.findFirst({ where: { oficinaId }, orderBy: { numero: "desc" }, select: { numero: true } });
  return (ultimo?.numero || 300) + 1;
}

function calcularTotal(itens, desconto = 0) {
  const subtotal = itens.reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
  return Math.max(subtotal - Number(desconto), 0);
}

async function listar(req, res, next) {
  try {
    const { status } = req.query;
    const orcamentos = await prisma.orcamento.findMany({
      where: { oficinaId: req.user.oficinaId, ...(status && { status }) },
      include: { cliente: { select: { nome: true } }, veiculo: { select: { placa: true, modelo: true } }, itens: true },
      orderBy: { createdAt: "desc" },
    });
    const comTotal = orcamentos.map((o) => ({ ...o, total: calcularTotal(o.itens, o.desconto) }));
    return res.json(comTotal);
  } catch (err) {
    return next(err);
  }
}

async function criar(req, res, next) {
  try {
    const data = orcamentoSchema.parse(req.body);
    const oficinaId = req.user.oficinaId;
    const numero = await proximoNumero(oficinaId);

    const orcamento = await prisma.orcamento.create({
      data: {
        oficinaId,
        numero,
        clienteId: data.clienteId,
        veiculoId: data.veiculoId,
        desconto: data.desconto,
        itens: { create: data.itens },
      },
      include: { itens: true, cliente: true, veiculo: true },
    });

    const total = calcularTotal(orcamento.itens, orcamento.desconto);

    // Envia o resumo por WhatsApp. Nunca bloqueia a resposta por causa disso
    // — se o cliente nao tiver telefone ou o envio falhar, a criacao do
    // orcamento segue normal.
    const numeroWhats = orcamento.cliente.whatsapp || orcamento.cliente.telefone;
    if (numeroWhats) {
      whatsapp
        .enviarMensagem({
          telefone: numeroWhats,
          mensagem: whatsapp.mensagemOrcamentoCriado({
            nomeCliente: orcamento.cliente.nome,
            numero: orcamento.numero,
            veiculo: [orcamento.veiculo.marca, orcamento.veiculo.modelo].filter(Boolean).join(" ") || orcamento.veiculo.placa,
            total,
          }),
        })
        .catch(() => {});
    }

    return res.status(201).json({ ...orcamento, total });
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/orcamentos/:id/status  { status: "APROVADO" | "REPROVADO" }
async function atualizarStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!["PENDENTE", "APROVADO", "REPROVADO"].includes(status)) {
      return res.status(400).json({ erro: "Status invalido." });
    }
    const existente = await prisma.orcamento.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Orcamento nao encontrado." });

    const orcamento = await prisma.orcamento.update({ where: { id: req.params.id }, data: { status } });
    return res.json(orcamento);
  } catch (err) {
    return next(err);
  }
}

// POST /api/orcamentos/:id/converter
// Converte um orcamento aprovado em uma Ordem de Servico, copiando os itens.
async function converterEmOS(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;
    const orcamento = await prisma.orcamento.findFirst({
      where: { id: req.params.id, oficinaId },
      include: { itens: true },
    });
    if (!orcamento) return res.status(404).json({ erro: "Orcamento nao encontrado." });
    if (orcamento.status !== "APROVADO") {
      return res.status(400).json({ erro: "Somente orcamentos aprovados podem ser convertidos em OS." });
    }

    const ultimaOS = await prisma.ordemServico.findFirst({ where: { oficinaId }, orderBy: { numero: "desc" }, select: { numero: true } });
    const numero = (ultimaOS?.numero || 1000) + 1;

    const resultado = await prisma.$transaction(async (tx) => {
      const novaOrdem = await tx.ordemServico.create({
        data: {
          oficinaId,
          numero,
          clienteId: orcamento.clienteId,
          veiculoId: orcamento.veiculoId,
          status: "ABERTA",
          itens: {
            create: orcamento.itens.map((it) => ({
              tipo: it.tipo,
              descricao: it.descricao,
              quantidade: it.quantidade,
              valorUnitario: it.valorUnitario,
            })),
          },
        },
      });

      await tx.orcamento.update({ where: { id: orcamento.id }, data: { status: "CONVERTIDO" } });

      const totalOrdem = orcamento.itens.reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
      if (totalOrdem > 0) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 7);
        await tx.contaReceber.create({
          data: {
            oficinaId,
            clienteId: orcamento.clienteId,
            ordemId: novaOrdem.id,
            descricao: `OS-${numero}`,
            valor: totalOrdem,
            vencimento,
          },
        });
      }

      return novaOrdem;
    });

    await registrarAuditoria({
      oficinaId,
      usuarioId: req.user.id,
      acao: "CONVERTER_ORCAMENTO_EM_OS",
      entidade: "Orcamento",
      entidadeId: orcamento.id,
      detalhes: { ordemGeradaId: resultado.id },
      ip: req.ip,
    });

    return res.status(201).json(resultado);
  } catch (err) {
    return next(err);
  }
}

// PUT /api/orcamentos/:id
// Edita um orcamento existente. Se novos itens forem enviados, os itens
// antigos sao substituidos por completo (mais simples e previsivel do que
// tentar casar item a item).
async function atualizar(req, res, next) {
  try {
    const data = orcamentoSchema.partial().parse(req.body);
    const oficinaId = req.user.oficinaId;

    const existente = await prisma.orcamento.findFirst({ where: { id: req.params.id, oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Orcamento não encontrado." });

    const orcamento = await prisma.$transaction(async (tx) => {
      if (data.itens) {
        await tx.itemOrcamento.deleteMany({ where: { orcamentoId: req.params.id } });
      }
      return tx.orcamento.update({
        where: { id: req.params.id },
        data: {
          ...(data.clienteId && { clienteId: data.clienteId }),
          ...(data.veiculoId && { veiculoId: data.veiculoId }),
          ...(data.desconto !== undefined && { desconto: data.desconto }),
          ...(data.itens && { itens: { create: data.itens } }),
        },
        include: { itens: true },
      });
    });

    return res.json({ ...orcamento, total: calcularTotal(orcamento.itens, orcamento.desconto) });
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/orcamentos/:id
async function remover(req, res, next) {
  try {
    const existente = await prisma.orcamento.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Orcamento não encontrado." });

    await prisma.orcamento.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, criar, atualizar, atualizarStatus, converterEmOS, remover };
