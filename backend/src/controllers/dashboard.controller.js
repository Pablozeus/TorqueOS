const prisma = require("../lib/prisma");

// GET /api/dashboard
// Agrega os numeros usados nos cards e no grafico do painel principal.
async function resumo(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;

    const [totalClientes, totalVeiculos, ordensAndamento, ordensConcluidas, orcamentosPendentes, pecasBaixoEstoque] = await Promise.all([
      prisma.cliente.count({ where: { oficinaId } }),
      prisma.veiculo.count({ where: { oficinaId } }),
      prisma.ordemServico.count({ where: { oficinaId, status: { in: ["EM_ANDAMENTO", "AGUARDANDO_PECAS", "AGUARDANDO_APROVACAO"] } } }),
      prisma.ordemServico.count({ where: { oficinaId, status: { in: ["FINALIZADA", "ENTREGUE"] } } }),
      prisma.orcamento.count({ where: { oficinaId, status: "PENDENTE" } }),
      prisma.peca.findMany({ where: { oficinaId } }).then((pecas) => pecas.filter((p) => p.quantidade <= p.estoqueMinimo).length),
    ]);

    const ultimasOrdens = await prisma.ordemServico.findMany({
      where: { oficinaId },
      include: { cliente: { select: { nome: true } }, veiculo: { select: { modelo: true, placa: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return res.json({
      totalClientes,
      totalVeiculos,
      ordensAndamento,
      ordensConcluidas,
      orcamentosPendentes,
      pecasBaixoEstoque,
      ultimasOrdens,
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/dashboard/faturamento-mensal
// Soma o valor dos itens das ordens de servico dos ultimos 6 meses,
// agrupado por mes de abertura da OS — usado no grafico do Dashboard.
async function faturamentoMensal(req, res, next) {
  try {
    const oficinaId = req.user.oficinaId;
    const hoje = new Date();

    const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    const ordens = await prisma.ordemServico.findMany({
      where: { oficinaId, dataAbertura: { gte: inicioJanela } },
      select: { dataAbertura: true, itens: { select: { valorUnitario: true, quantidade: true } } },
    });

    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      meses.push({
        chave: `${d.getFullYear()}-${d.getMonth()}`,
        mes: label.charAt(0).toUpperCase() + label.slice(1),
        valor: 0,
      });
    }

    for (const ordem of ordens) {
      const d = new Date(ordem.dataAbertura);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = meses.find((m) => m.chave === chave);
      if (!bucket) continue;
      bucket.valor += ordem.itens.reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
    }

    return res.json(meses.map(({ mes, valor }) => ({ mes, valor: Math.round(valor * 100) / 100 })));
  } catch (err) {
    return next(err);
  }
}

module.exports = { resumo, faturamentoMensal };
