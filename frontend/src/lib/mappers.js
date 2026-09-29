// Traduz o formato de dados que vem da API para o mesmo formato que os
// componentes de tela já usavam com os dados mock — assim a interface não
// precisa mudar, só a origem dos dados.

export const STATUS_OS_API_TO_UI = {
  ABERTA: "aberta",
  EM_ANDAMENTO: "andamento",
  AGUARDANDO_PECAS: "pecas",
  AGUARDANDO_APROVACAO: "aprovacao",
  FINALIZADA: "finalizada",
  ENTREGUE: "entregue",
  CANCELADA: "cancelada",
  DESISTENCIA: "desistencia",
};

export const STATUS_OS_UI_TO_API = Object.fromEntries(Object.entries(STATUS_OS_API_TO_UI).map(([k, v]) => [v, k]));

export const STATUS_ORCAMENTO_API_TO_UI = {
  PENDENTE: "pendente",
  APROVADO: "aprovado",
  REPROVADO: "reprovado",
  CONVERTIDO: "aprovado",
};

export const STATUS_ORCAMENTO_UI_TO_API = {
  pendente: "PENDENTE",
  aprovado: "APROVADO",
  reprovado: "REPROVADO",
};

export function formatarDataCurta(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatarDataLonga(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function mapCliente(c) {
  return {
    id: c.id,
    nome: c.nome,
    doc: c.cpfCnpj || "—",
    telefone: c.telefone || "—",
    whatsapp: !!c.whatsapp,
    email: c.email || "—",
    endereco: c.endereco || "—",
    veiculos: c._count?.veiculos ?? 0,
    ultimaVisita: "—", // a API ainda não rastreia a última visita por cliente
  };
}

export function mapVeiculo(v) {
  return {
    id: v.id,
    clienteId: v.clienteId,
    placa: v.placa,
    marca: v.marca || "—",
    modelo: v.modelo || "—",
    ano: v.ano || "—",
    cor: v.cor || "—",
    km: v.km || 0,
    chassi: v.chassi || "—",
    cliente: v.cliente?.nome || "—",
  };
}

export function mapOrdem(o) {
  const totalItens = (o.itens || []).reduce((acc, it) => acc + Number(it.valorUnitario) * it.quantidade, 0);
  return {
    id: `OS-${o.numero}`,
    apiId: o.id,
    cliente: o.cliente?.nome || "—",
    clienteId: o.clienteId,
    veiculo: [o.veiculo?.marca, o.veiculo?.modelo].filter(Boolean).join(" ") || "—",
    veiculoId: o.veiculoId,
    placa: o.veiculo?.placa || "—",
    mecanico: o.mecanico ? [o.mecanico.nome, o.mecanico.cargo].filter(Boolean).join(" — ") : "Não atribuído",
    status: STATUS_OS_API_TO_UI[o.status] || "aberta",
    data: formatarDataCurta(o.dataAbertura || o.createdAt),
    valor: totalItens,
  };
}

export function mapOrcamento(o) {
  return {
    id: `ORC-${o.numero}`,
    apiId: o.id,
    cliente: o.cliente?.nome || "—",
    clienteId: o.clienteId,
    veiculo: [o.veiculo?.marca, o.veiculo?.modelo, o.veiculo?.placa ? `— ${o.veiculo.placa}` : null].filter(Boolean).join(" ") || "—",
    veiculoId: o.veiculoId,
    status: STATUS_ORCAMENTO_API_TO_UI[o.status] || "pendente",
    convertido: o.status === "CONVERTIDO",
    itens: (o.itens || []).map((it) => ({
      tipo: it.tipo === "PECA" ? "peca" : "mao_obra",
      nome: it.descricao,
      valor: Number(it.valorUnitario) * it.quantidade,
    })),
  };
}

export function mapPeca(p) {
  return {
    id: p.id,
    codigo: p.codigo,
    nome: p.nome,
    categoria: p.categoria || "—",
    fornecedor: p.fornecedor || "—",
    quantidade: p.quantidade,
    minimo: p.estoqueMinimo,
    valorCompra: Number(p.valorCompra),
    valorVenda: Number(p.valorVenda),
  };
}

export function mapUsuario(u) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    cargo: u.cargo || "",
    perfil: u.perfil,
    ativo: u.ativo,
  };
}

export function mapContaReceber(c) {
  return {
    id: c.id,
    cliente: c.cliente?.nome || "—",
    descricao: c.descricao,
    vencimento: formatarDataLonga(c.vencimento),
    valor: Number(c.valor),
    status: c.status === "PAGO" ? "pago" : "pendente",
  };
}

export function mapContaPagar(c) {
  return {
    id: c.id,
    fornecedor: c.fornecedor,
    descricao: c.descricao,
    vencimento: formatarDataLonga(c.vencimento),
    valor: Number(c.valor),
    status: c.status === "PAGO" ? "pago" : "pendente",
  };
}
