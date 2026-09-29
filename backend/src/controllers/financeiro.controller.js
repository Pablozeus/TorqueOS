const { z } = require("zod");
const prisma = require("../lib/prisma");
const whatsapp = require("../services/whatsapp");

const contaReceberSchema = z.object({
  clienteId: z.string().optional(),
  ordemId: z.string().optional(),
  descricao: z.string().min(1),
  valor: z.coerce.number().min(0),
  vencimento: z.coerce.date(),
});

const contaPagarSchema = z.object({
  fornecedor: z.string().min(1),
  descricao: z.string().min(1),
  valor: z.coerce.number().min(0),
  tipo: z.enum(["FIXA", "VARIAVEL"]).default("VARIAVEL"),
  vencimento: z.coerce.date(),
});

async function listarReceber(req, res, next) {
  try {
    const { status } = req.query;
    const contas = await prisma.contaReceber.findMany({
      where: { oficinaId: req.user.oficinaId, ...(status && { status }) },
      include: { cliente: { select: { nome: true } } },
      orderBy: { vencimento: "asc" },
    });
    return res.json(contas);
  } catch (err) {
    return next(err);
  }
}

async function criarReceber(req, res, next) {
  try {
    const data = contaReceberSchema.parse(req.body);
    const conta = await prisma.contaReceber.create({ data: { ...data, oficinaId: req.user.oficinaId } });
    return res.status(201).json(conta);
  } catch (err) {
    return next(err);
  }
}

async function listarPagar(req, res, next) {
  try {
    const { status } = req.query;
    const contas = await prisma.contaPagar.findMany({
      where: { oficinaId: req.user.oficinaId, ...(status && { status }) },
      orderBy: { vencimento: "asc" },
    });
    return res.json(contas);
  } catch (err) {
    return next(err);
  }
}

async function criarPagar(req, res, next) {
  try {
    const data = contaPagarSchema.parse(req.body);
    const conta = await prisma.contaPagar.create({ data: { ...data, oficinaId: req.user.oficinaId } });
    return res.status(201).json(conta);
  } catch (err) {
    return next(err);
  }
}

// PATCH /api/financeiro/receber/:id/pagar  |  /api/financeiro/pagar/:id/pagar
function marcarComoPago(model) {
  return async (req, res, next) => {
    try {
      const existente = await model.findFirst({ where: { id: req.params.id, oficinaId: req.user.oficinaId } });
      if (!existente) return res.status(404).json({ erro: "Conta nao encontrada." });

      const conta = await model.update({ where: { id: req.params.id }, data: { status: "PAGO", pagoEm: new Date() } });
      return res.json(conta);
    } catch (err) {
      return next(err);
    }
  };
}

// GET /api/financeiro/indicadores?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
async function indicadores(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;
    const inicio = req.query.inicio ? new Date(req.query.inicio) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const fim = req.query.fim ? new Date(req.query.fim) : new Date();

    const [receitas, despesas] = await Promise.all([
      prisma.contaReceber.aggregate({
        where: { oficinaId, status: "PAGO", pagoEm: { gte: inicio, lte: fim } },
        _sum: { valor: true },
      }),
      prisma.contaPagar.aggregate({
        where: { oficinaId, status: "PAGO", pagoEm: { gte: inicio, lte: fim } },
        _sum: { valor: true },
      }),
    ]);

    const receita = Number(receitas._sum.valor || 0);
    const despesa = Number(despesas._sum.valor || 0);

    return res.json({ receita, despesa, lucro: receita - despesa, periodo: { inicio, fim } });
  } catch (err) {
    return next(err);
  }
}

// POST /api/financeiro/receber/:id/cobrar
// Envia uma mensagem de cobrança por WhatsApp para o cliente dono dessa
// conta. Não muda status nenhum — é só um lembrete manual.
async function cobrarReceberPorWhatsapp(req, res, next) {
  try {
    const conta = await prisma.contaReceber.findFirst({
      where: { id: req.params.id, oficinaId: req.user.oficinaId },
      include: { cliente: true },
    });
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
    if (!conta.cliente) return res.status(400).json({ erro: "Essa conta não está vinculada a um cliente com telefone." });

    const numeroWhats = conta.cliente.whatsapp || conta.cliente.telefone;
    const resultado = await whatsapp.enviarMensagem({
      telefone: numeroWhats,
      mensagem: whatsapp.mensagemCobranca({
        nomeCliente: conta.cliente.nome,
        descricao: conta.descricao,
        valor: Number(conta.valor),
        vencimento: new Date(conta.vencimento).toLocaleDateString("pt-BR"),
      }),
    });

    if (!resultado.enviado) {
      return res.status(400).json({ erro: resultado.motivo || "Não foi possível enviar a cobrança." });
    }

    return res.json({ enviado: true, simulado: !!resultado.simulado });
  } catch (err) {
    return next(err);
  }
}

const MESES_LABEL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// GET /api/financeiro/relatorio-anual?ano=2026
// Monta a visao mes a mes do ano inteiro: faturamento das OS, receita e
// despesas pagas (separando fixa/variavel), dividas em aberto, lucro,
// ticket medio por carro e margem de lucro — tudo calculado a partir dos
// dados reais, sem precisar preencher nada na mao.
async function relatorioAnual(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    const inicioAno = new Date(ano, 0, 1);
    const fimAno = new Date(ano, 11, 31, 23, 59, 59);

    const [ordens, receitasPagas, despesasPagas, dividasAbertas] = await Promise.all([
      prisma.ordemServico.findMany({
        where: { oficinaId, dataAbertura: { gte: inicioAno, lte: fimAno } },
        select: { dataAbertura: true, itens: { select: { valorUnitario: true, quantidade: true } } },
      }),
      prisma.contaReceber.findMany({
        where: { oficinaId, status: "PAGO", pagoEm: { gte: inicioAno, lte: fimAno } },
        select: { valor: true, pagoEm: true },
      }),
      prisma.contaPagar.findMany({
        where: { oficinaId, status: "PAGO", pagoEm: { gte: inicioAno, lte: fimAno } },
        select: { valor: true, pagoEm: true, tipo: true },
      }),
      prisma.contaPagar.findMany({
        where: { oficinaId, status: "PENDENTE", vencimento: { gte: inicioAno, lte: fimAno } },
        select: { valor: true, vencimento: true },
      }),
    ]);

    const meses = MESES_LABEL.map((mes, i) => ({
      mes,
      faturamento: 0,
      numeroOS: 0,
      receita: 0,
      custosFixos: 0,
      custosVariaveis: 0,
      dividas: 0,
      _indice: i,
    }));

    for (const ordem of ordens) {
      const bucket = meses[new Date(ordem.dataAbertura).getMonth()];
      bucket.faturamento += ordem.itens.reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
      bucket.numeroOS += 1;
    }
    for (const conta of receitasPagas) {
      meses[new Date(conta.pagoEm).getMonth()].receita += Number(conta.valor);
    }
    for (const conta of despesasPagas) {
      const bucket = meses[new Date(conta.pagoEm).getMonth()];
      if (conta.tipo === "FIXA") bucket.custosFixos += Number(conta.valor);
      else bucket.custosVariaveis += Number(conta.valor);
    }
    for (const conta of dividasAbertas) {
      meses[new Date(conta.vencimento).getMonth()].dividas += Number(conta.valor);
    }

    const linhas = meses.map(({ _indice, ...m }) => {
      const despesasTotal = m.custosFixos + m.custosVariaveis;
      const lucro = m.receita - despesasTotal;
      return {
        ...m,
        lucro,
        ticketMedio: m.numeroOS > 0 ? m.faturamento / m.numeroOS : 0,
        margemLucro: m.receita > 0 ? (lucro / m.receita) * 100 : 0,
      };
    });

    const somar = (campo) => linhas.reduce((acc, l) => acc + l[campo], 0);
    const totalNumeroOS = somar("numeroOS");
    const totalReceita = somar("receita");
    const totalLucro = somar("lucro");

    const totalAnual = {
      mes: "Total Anual",
      faturamento: somar("faturamento"),
      numeroOS: totalNumeroOS,
      receita: totalReceita,
      custosFixos: somar("custosFixos"),
      custosVariaveis: somar("custosVariaveis"),
      dividas: somar("dividas"),
      lucro: totalLucro,
      ticketMedio: totalNumeroOS > 0 ? somar("faturamento") / totalNumeroOS : 0,
      margemLucro: totalReceita > 0 ? (totalLucro / totalReceita) * 100 : 0,
    };

    return res.json({ ano, meses: linhas, totalAnual });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarReceber,
  criarReceber,
  listarPagar,
  criarPagar,
  marcarComoPagoReceber: marcarComoPago(prisma.contaReceber),
  marcarComoPagoPagar: marcarComoPago(prisma.contaPagar),
  cobrarReceberPorWhatsapp,
  indicadores,
  relatorioAnual,
};
