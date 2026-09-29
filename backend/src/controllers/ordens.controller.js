const { z } = require("zod");
const prisma = require("../lib/prisma");
const { registrarAuditoria } = require("../middleware/auditLog");
const whatsapp = require("../services/whatsapp");

const itemSchema = z.object({
  tipo: z.enum(["PECA", "MAO_DE_OBRA"]),
  pecaId: z.string().optional(),
  descricao: z.string().min(1),
  quantidade: z.coerce.number().int().min(1).default(1),
  valorUnitario: z.coerce.number().min(0),
});

const ordemSchema = z.object({
  clienteId: z.string(),
  veiculoId: z.string(),
  mecanicoId: z.string().optional(),
  descricaoProblema: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).default([]),
});

const STATUS_VALIDOS = [
  "ABERTA",
  "EM_ANDAMENTO",
  "AGUARDANDO_PECAS",
  "AGUARDANDO_APROVACAO",
  "FINALIZADA",
  "ENTREGUE",
  "CANCELADA",
  "DESISTENCIA",
];

async function proximoNumero(oficinaId) {
  const ultima = await prisma.ordemServico.findFirst({
    where: { oficinaId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  return (ultima?.numero || 1000) + 1;
}

async function listar(req, res, next) {
  try {
    const { status, busca } = req.query;
    const ordens = await prisma.ordemServico.findMany({
      where: {
        oficinaId: req.user.oficinaId,
        // Mecanico so ve as OS atribuidas a ele mesmo — isolamento aplicado
        // aqui, na origem, nao apenas escondido na interface.
        ...(req.user.perfil === "MECANICO" && { mecanicoId: req.user.id }),
        ...(status && { status }),
        ...(busca && {
          OR: [
            { cliente: { nome: { contains: busca, mode: "insensitive" } } },
            { veiculo: { placa: { contains: busca, mode: "insensitive" } } },
          ],
        }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true, marca: true } },
        mecanico: { select: { id: true, nome: true, cargo: true } },
        itens: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(ordens);
  } catch (err) {
    return next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const ordem = await prisma.ordemServico.findFirst({
      where: { id: req.params.id, oficinaId: req.user.oficinaId },
      include: { cliente: true, veiculo: true, mecanico: true, itens: { include: { peca: true } } },
    });
    if (!ordem) return res.status(404).json({ erro: "Ordem de servico nao encontrada." });
    if (req.user.perfil === "MECANICO" && ordem.mecanicoId !== req.user.id) {
      return res.status(403).json({ erro: "Esta OS nao esta atribuida a voce." });
    }
    return res.json(ordem);
  } catch (err) {
    return next(err);
  }
}

// POST /api/ordens
// Cria a OS e da baixa automatica no estoque para cada item do tipo PECA,
// tudo dentro de uma transacao — ou tudo e gravado, ou nada e.
async function criar(req, res, next) {
  try {
    const data = ordemSchema.parse(req.body);
    const oficinaId = req.user.oficinaId;

    const [cliente, veiculo] = await Promise.all([
      prisma.cliente.findFirst({ where: { id: data.clienteId, oficinaId } }),
      prisma.veiculo.findFirst({ where: { id: data.veiculoId, oficinaId } }),
    ]);
    if (!cliente) return res.status(400).json({ erro: "Cliente invalido para esta oficina." });
    if (!veiculo) return res.status(400).json({ erro: "Veiculo invalido para esta oficina." });

    const numero = await proximoNumero(oficinaId);

    const ordem = await prisma.$transaction(async (tx) => {
      const novaOrdem = await tx.ordemServico.create({
        data: {
          oficinaId,
          numero,
          clienteId: data.clienteId,
          veiculoId: data.veiculoId,
          mecanicoId: data.mecanicoId,
          descricaoProblema: data.descricaoProblema,
          observacoes: data.observacoes,
          itens: { create: data.itens },
        },
        include: { itens: true },
      });

      for (const item of novaOrdem.itens) {
        if (item.tipo === "PECA" && item.pecaId) {
          const peca = await tx.peca.findFirst({ where: { id: item.pecaId, oficinaId } });
          if (!peca) continue; // peca de fornecedor externo, sem controle de estoque

          await tx.peca.update({
            where: { id: peca.id },
            data: { quantidade: { decrement: item.quantidade } },
          });

          await tx.movimentacaoEstoque.create({
            data: {
              oficinaId,
              pecaId: peca.id,
              tipo: "SAIDA",
              quantidade: item.quantidade,
              motivo: `Uso na OS-${numero}`,
              ordemId: novaOrdem.id,
            },
          });
        }
      }

      // Gera automaticamente uma conta a receber para a OS, se ela tiver valor.
      // Assim o Financeiro reflete o movimento das ordens de servico sem
      // precisar de lancamento manual.
      const totalOrdem = novaOrdem.itens.reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
      if (totalOrdem > 0) {
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 7);
        await tx.contaReceber.create({
          data: {
            oficinaId,
            clienteId: data.clienteId,
            ordemId: novaOrdem.id,
            descricao: `OS-${numero}`,
            valor: totalOrdem,
            vencimento,
          },
        });
      }

      return novaOrdem;
    });

    await registrarAuditoria({ oficinaId, usuarioId: req.user.id, acao: "CRIAR_OS", entidade: "OrdemServico", entidadeId: ordem.id, ip: req.ip });

    return res.status(201).json(ordem);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/ordens/:id/status
async function atualizarStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `Status invalido. Use um de: ${STATUS_VALIDOS.join(", ")}` });
    }

    const existente = await prisma.ordemServico.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Ordem de servico nao encontrada." });
    if (req.user.perfil === "MECANICO" && existente.mecanicoId !== req.user.id) {
      return res.status(403).json({ erro: "Esta OS nao esta atribuida a voce." });
    }

    const data = { status };
    if (status === "ENTREGUE") data.dataEntrega = new Date();

    const ordem = await prisma.ordemServico.update({
      where: { id: req.params.id },
      data,
      include: { cliente: true, veiculo: true },
    });

    // Avisa o cliente por WhatsApp quando o veiculo fica pronto — só na
    // transicao para FINALIZADA (nao reenvia se o status for alterado de
    // novo depois, tipo indo e voltando entre status).
    if (status === "FINALIZADA" && existente.status !== "FINALIZADA") {
      const numeroWhats = ordem.cliente.whatsapp || ordem.cliente.telefone;
      if (numeroWhats) {
        whatsapp
          .enviarMensagem({
            telefone: numeroWhats,
            mensagem: whatsapp.mensagemVeiculoPronto({
              nomeCliente: ordem.cliente.nome,
              numeroOS: `OS-${ordem.numero}`,
              veiculo: [ordem.veiculo.marca, ordem.veiculo.modelo].filter(Boolean).join(" ") || "veículo",
              placa: ordem.veiculo.placa,
            }),
          })
          .catch(() => {});
      }
    }

    await registrarAuditoria({
      oficinaId: req.user.oficinaId,
      usuarioId: req.user.id,
      acao: "ALTERAR_STATUS_OS",
      entidade: "OrdemServico",
      entidadeId: ordem.id,
      detalhes: { novoStatus: status },
      ip: req.ip,
    });

    return res.json(ordem);
  } catch (err) {
    return next(err);
  }
}

async function remover(req, res, next) {
  try {
    const existente = await prisma.ordemServico.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
    if (!existente) return res.status(404).json({ erro: "Ordem de servico nao encontrada." });

    await prisma.ordemServico.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizarStatus, remover };
