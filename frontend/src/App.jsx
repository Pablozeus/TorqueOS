import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Wrench,
  Menu,
  ChevronRight,
  ChevronDown,
  DollarSign,
  CircleAlert,
  Car,
  FileText,
  Package,
  Wallet,
  LogIn,
  UserPlus,
  Check,
  Star,
  ShieldCheck,
  Zap,
  MessageCircle,
  ArrowRight,
  LogOut,
  TrendingDown,
  Trash2,
  Loader2,
  UserCog,
  Pencil,
  CreditCard,
  FileBarChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  authApi,
  clientesApi,
  veiculosApi,
  ordensApi,
  orcamentosApi,
  estoqueApi,
  financeiroApi,
  usuariosApi,
  assinaturaApi,
  dashboardApi,
  setOnSessionExpired,
  getAccessToken,
  setTokens,
  clearTokens,
} from "./lib/api";
import {
  mapCliente,
  mapVeiculo,
  mapOrdem,
  mapOrcamento,
  mapPeca,
  mapUsuario,
  mapContaReceber,
  mapContaPagar,
  STATUS_OS_UI_TO_API,
} from "./lib/mappers";

/* ---------------------------------------------------------
   Dados mock
--------------------------------------------------------- */

const STATUS = {
  aberta: { label: "Aberta", chip: "bg-blue-100 text-blue-700 border-blue-200" },
  andamento: { label: "Em andamento", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  pecas: { label: "Aguardando peças", chip: "bg-red-100 text-red-700 border-red-200" },
  aprovacao: { label: "Aguardando aprovação", chip: "bg-purple-100 text-purple-700 border-purple-200" },
  finalizada: { label: "Pronto", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  entregue: { label: "Entregue", chip: "bg-slate-200 text-slate-600 border-slate-300" },
  cancelada: { label: "Cancelado", chip: "bg-red-50 text-red-500 border-red-200" },
  desistencia: { label: "Desistência", chip: "bg-orange-50 text-orange-500 border-orange-200" },
};

const CATEGORIAS_ESTOQUE = [
  "Peças mecânicas",
  "Motor",
  "Freios",
  "Suspensão",
  "Elétrica",
  "Lubrificantes",
  "Filtros",
  "Tintas e vernizes",
  "Massa e primer",
  "Lixas e abrasivos",
  "Funilaria",
  "Consumíveis",
  "Outros",
];

// perfil = NIVEL DE ACESSO ao sistema (nao e o cargo da pessoa).
// ADMIN/GERENTE/ATENDENTE veem tudo. MECANICO e o nivel de acesso restrito
// — so enxerga as proprias OS — e serve pra qualquer funcao de chao de
// oficina (mecânico, pintor, funileiro, ajudante, mecânico preparador...).
const PERFIL_LABELS = {
  ADMIN: "Administrador — acesso total",
  GERENTE: "Gerente — acesso total",
  ATENDENTE: "Atendente — acesso total",
  MECANICO: "Equipe operacional — só vê as próprias OS",
};

const PERFIL_BADGE = {
  ADMIN: "Acesso total",
  GERENTE: "Acesso total",
  ATENDENTE: "Acesso total",
  MECANICO: "Acesso restrito",
};

// cargo = a funcao real da pessoa, texto livre. Estas sao so sugestoes de
// autocomplete; a oficina pode digitar qualquer coisa.
const CARGOS_SUGERIDOS = [
  "Mecânico",
  "Mecânico Preparador",
  "Pintor",
  "Funileiro",
  "Ajudante",
  "Lavador",
  "Atendente",
  "Gerente",
  "Administrador",
];

const ORCAMENTO_STATUS = {
  pendente: { label: "Pendente", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  aprovado: { label: "Aprovado", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  reprovado: { label: "Reprovado", chip: "bg-red-100 text-red-700 border-red-200" },
};

// Série ilustrativa usada apenas no gráfico de faturamento do Dashboard —
// a API ainda não expõe faturamento agregado por mês, então este gráfico
// mostra uma tendência de exemplo enquanto esse endpoint não existe.
const faturamento = [
  { mes: "Fev", valor: 18400 },
  { mes: "Mar", valor: 21200 },
  { mes: "Abr", valor: 19800 },
  { mes: "Mai", valor: 24600 },
  { mes: "Jun", valor: 26100 },
  { mes: "Jul", valor: 28950 },
];

/* ---------------------------------------------------------
   Utilidades visuais
--------------------------------------------------------- */

function StatusChip({ status, map = STATUS }) {
  const s = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.chip}`}>
      {s.label}
    </span>
  );
}

function money(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ---------------------------------------------------------
   Sidebar / Topbar
--------------------------------------------------------- */

function Sidebar({ active, setActive, open, setOpen, onLogout, nomeOficina, perfil }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "os", label: "Ordens de Serviço", icon: ClipboardList },
    { key: "clientes", label: "Clientes", icon: Users },
    { key: "veiculos", label: "Veículos", icon: Car },
    { key: "orcamentos", label: "Orçamentos", icon: FileText },
    { key: "estoque", label: "Estoque", icon: Package },
    { key: "financeiro", label: "Financeiro", icon: Wallet },
    { key: "relatorio-anual", label: "Relatório Anual", icon: FileBarChart },
    { key: "equipe", label: "Equipe", icon: UserCog },
    ...(perfil === "ADMIN" ? [{ key: "assinatura", label: "Assinatura", icon: CreditCard }] : []),
  ];
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`fixed md:static z-30 top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <span className="font-display text-xl tracking-wide text-white">
            TORQUE<span className="text-orange-500">OS</span>
          </span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => {
                  setActive(it.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-orange-600/15 text-orange-400 border-l-2 border-orange-500 pl-[10px]"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {it.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pb-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
        <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-500">
          {nomeOficina || "Sua oficina"}
          <div className="text-slate-600">Plano Profissional</div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, setOpen, nomeUsuario }) {
  const iniciais = (nomeUsuario || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-slate-600" onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
        <h1 className="font-display text-2xl text-slate-900 tracking-wide">{title}</h1>
      </div>
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-medium">
        {iniciais}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */

function Dashboard({ orders, clients, orcamentos, faturamentoMensal }) {
  const emAndamento = orders.filter((o) => o.status === "andamento").length;
  const concluidas = orders.filter((o) => o.status === "finalizada" || o.status === "entregue").length;
  const orcamentosPendentes = orcamentos.filter((o) => o.status === "pendente").length;
  const faturamentoMes = orders.reduce((acc, o) => acc + o.valor, 0);
  const serieFaturamento = faturamentoMensal.length > 0 ? faturamentoMensal : faturamento;

  const kpis = [
    { label: "Clientes ativos", value: clients.length, icon: Users, accent: "text-blue-600 bg-blue-50" },
    { label: "OS em andamento", value: emAndamento, icon: Wrench, accent: "text-amber-600 bg-amber-50" },
    { label: "OS concluídas (mês)", value: concluidas, icon: ClipboardList, accent: "text-emerald-600 bg-emerald-50" },
    { label: "Orçamentos pendentes", value: orcamentosPendentes, icon: CircleAlert, accent: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-3 ${k.accent}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-semibold text-slate-900 font-display">{k.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-500">Faturamento dos últimos 6 meses</div>
              <div className="text-xl font-display text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-600" />
                {money(serieFaturamento[serieFaturamento.length - 1]?.valor || 0)}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serieFaturamento}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
              <Bar dataKey="valor" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="text-sm text-slate-500 mb-3">Valor em aberto (OS do mês)</div>
          <div className="flex items-center gap-2 text-3xl font-display text-slate-900 mb-4">
            <DollarSign size={22} className="text-emerald-600" />
            {money(faturamentoMes)}
          </div>
          <div className="space-y-2">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-plate">{o.id}</span>
                <span className="text-slate-900">{money(o.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 text-sm font-medium text-slate-700">
          Últimas Ordens de Serviço
        </div>
        <div className="divide-y divide-slate-100">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-plate text-slate-500 w-16">{o.id}</span>
                <span className="text-slate-900">{o.cliente}</span>
                <span className="text-slate-400 hidden sm:inline">· {o.veiculo}</span>
              </div>
              <div className="flex items-center gap-4">
                <StatusChip status={o.status} />
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Ordens de Serviço
--------------------------------------------------------- */

function OrderTag({ o, onMudarStatus, onExcluir, processando }) {
  return (
    <div className="relative bg-white border border-slate-200 border-dashed rounded-md p-4 pl-8 hover:-rotate-1 hover:shadow-md transition-transform duration-150">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-300 bg-slate-50" />
      <div className="flex items-start justify-between mb-2">
        <span className="font-plate text-sm text-slate-500">{o.id}</span>
        <StatusChip status={o.status} />
      </div>
      <div className="text-slate-900 font-medium">{o.cliente}</div>
      <div className="text-sm text-slate-500">{o.veiculo}</div>
      <div className="font-plate text-xs text-slate-400 mt-1 tracking-wider">{o.placa}</div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span>Responsável: {o.mecanico}</span>
        <span>{o.data}</span>
      </div>
      {o.valor > 0 && <div className="mt-2 text-sm font-semibold text-slate-900">{money(o.valor)}</div>}
      {(onMudarStatus || onExcluir) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          {onMudarStatus && (
            <select
              value={o.status}
              onChange={(e) => onMudarStatus(o, e.target.value)}
              disabled={processando}
              className="flex-1 text-xs px-2 py-1.5 rounded-md border border-slate-200 bg-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              {Object.entries(STATUS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          {onExcluir && (
            <button
              onClick={() => onExcluir(o)}
              disabled={processando}
              className="text-slate-400 hover:text-red-600 disabled:opacity-60 p-1.5"
              title="Excluir OS"
            >
              {processando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItensEditor({ itens, setItens }) {
  const addItem = () => setItens([...itens, { tipo: "peca", nome: "", valor: "" }]);
  const removeItem = (idx) => setItens(itens.filter((_, i) => i !== idx));
  const updateItem = (idx, field) => (e) => {
    const novo = [...itens];
    novo[idx] = { ...novo[idx], [field]: e.target.value };
    setItens(novo);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500">Itens (peças e mão de obra)</label>
      {itens.map((it, idx) => (
        <div key={idx} className="flex gap-2 items-start bg-slate-50 border border-slate-200 rounded-md p-2">
          <select
            value={it.tipo}
            onChange={updateItem(idx, "tipo")}
            className="px-2 py-1.5 rounded border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          >
            <option value="peca">Peça/material</option>
            <option value="mao_obra">Mão de obra</option>
          </select>
          <input
            value={it.nome}
            onChange={updateItem(idx, "nome")}
            placeholder="Descrição"
            className="flex-1 px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={it.valor}
            onChange={updateItem(idx, "valor")}
            placeholder="R$"
            className="w-20 px-2 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
          <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-600 p-1.5">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 mt-1">
        <Plus size={14} /> Adicionar item
      </button>
    </div>
  );
}

function NovaOSModal({ onClose, onSave, equipe, onIrParaEquipe }) {
  const [form, setForm] = useState({ cliente: "", veiculo: "", placa: "", mecanicoId: "", descricaoProblema: "" });
  const [itens, setItens] = useState([{ tipo: "peca", nome: "", valor: "" }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const total = itens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);

  const handleSave = async () => {
    if (!form.cliente.trim()) {
      setErro("Informe o cliente.");
      return;
    }
    if (!form.veiculo.trim()) {
      setErro("Informe o veículo.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave({ ...form, itens, total });
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">Nova Ordem de Serviço</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500">Cliente</label>
            <input
              value={form.cliente}
              onChange={update("cliente")}
              list="lista-clientes"
              placeholder="Digite o nome — não precisa já estar cadastrado"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Veículo</label>
              <input
                value={form.veiculo}
                onChange={update("veiculo")}
                list="lista-modelos"
                placeholder="Marca e modelo"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Placa</label>
              <input
                value={form.placa}
                onChange={update("placa")}
                list="lista-placas"
                placeholder="Obrigatória se for veículo novo"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Responsável (mecânico, pintor, funileiro...)</label>
            <select
              value={form.mecanicoId}
              onChange={update("mecanicoId")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            >
              <option value="">Não atribuído</option>
              {equipe
                .filter((m) => m.ativo)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} — {m.cargo || PERFIL_BADGE[m.perfil] || m.perfil}
                  </option>
                ))}
            </select>
            {equipe.length === 0 && (
              <button type="button" onClick={onIrParaEquipe} className="text-xs text-orange-600 font-medium mt-1">
                Nenhum membro cadastrado ainda — cadastrar equipe
              </button>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Descrição do problema</label>
            <textarea
              value={form.descricaoProblema}
              onChange={update("descricaoProblema")}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <ItensEditor itens={itens} setItens={setItens} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-display text-lg text-slate-900">{money(total)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Criando..." : "Criar OS"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdensServico({ orders, resolverClienteId, resolverVeiculoId, onCriada, equipe, onIrParaEquipe }) {
  const [filter, setFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [processando, setProcessando] = useState(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = filter === "todas" || o.status === filter;
      const matchQuery =
        query.trim() === "" ||
        o.cliente.toLowerCase().includes(query.toLowerCase()) ||
        o.placa.toLowerCase().includes(query.toLowerCase()) ||
        o.id.toLowerCase().includes(query.toLowerCase());
      return matchStatus && matchQuery;
    });
  }, [orders, filter, query]);

  const mudarStatus = async (ordem, novoStatusUi) => {
    setProcessando(ordem.apiId);
    try {
      await ordensApi.atualizarStatus(ordem.apiId, STATUS_OS_UI_TO_API[novoStatusUi]);
      await onCriada();
    } finally {
      setProcessando(null);
    }
  };

  const excluirOrdem = async (ordem) => {
    if (!window.confirm(`Excluir a ${ordem.id}? Essa ação não pode ser desfeita.`)) return;
    setProcessando(ordem.apiId);
    try {
      await ordensApi.remover(ordem.apiId);
      await onCriada();
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, placa ou nº da OS"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Nova OS
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["todas", ...Object.keys(STATUS)].map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {key === "todas" ? "Todas" : STATUS[key].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => (
          <OrderTag
            key={o.id}
            o={o}
            onMudarStatus={mudarStatus}
            onExcluir={excluirOrdem}
            processando={processando === o.apiId}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-slate-400 py-10">Nenhuma ordem de serviço encontrada.</div>
        )}
      </div>

      {showModal && (
        <NovaOSModal
          onClose={() => setShowModal(false)}
          equipe={equipe}
          onIrParaEquipe={() => {
            setShowModal(false);
            onIrParaEquipe();
          }}
          onSave={async ({ cliente, veiculo, placa, mecanicoId, descricaoProblema, itens }) => {
            const clienteId = await resolverClienteId(cliente);
            const veiculoId = await resolverVeiculoId({ clienteId, placa, veiculoTexto: veiculo });
            const itensValidos = itens
              .filter((it) => it.nome.trim())
              .map((it) => ({
                tipo: it.tipo === "peca" ? "PECA" : "MAO_DE_OBRA",
                descricao: it.nome,
                quantidade: 1,
                valorUnitario: Number(it.valor) || 0,
              }));
            await ordensApi.criar({
              clienteId,
              veiculoId,
              mecanicoId: mecanicoId || undefined,
              descricaoProblema: descricaoProblema || undefined,
              itens: itensValidos,
            });
            await onCriada();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Área do Mecânico (visão restrita)
--------------------------------------------------------- */

function MinhasOrdens({ orders, usuario, onLogout, carregando, erro, onMudarStatus, processando, estoque, onEstoqueCriado }) {
  const [aba, setAba] = useState("os");
  const [filter, setFilter] = useState("todas");
  const filtered = filter === "todas" ? orders : orders.filter((o) => o.status === filter);

  const emAndamento = orders.filter((o) => o.status === "andamento").length;
  const abertas = orders.filter((o) => o.status === "aberta").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <div>
              <div className="font-display text-lg tracking-wide leading-none">
                TORQUE<span className="text-orange-500">OS</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{aba === "os" ? "Minhas Ordens de Serviço" : "Estoque"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300 hidden sm:inline">
              Olá, {usuario?.nome}
              {usuario?.cargo ? ` — ${usuario.cargo}` : ""}
            </span>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 md:px-8 flex gap-1">
          <button
            onClick={() => setAba("os")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === "os" ? "border-orange-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Minhas OS
          </button>
          <button
            onClick={() => setAba("estoque")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aba === "estoque" ? "border-orange-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Estoque
          </button>
        </div>
      </div>

      {erro && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
            <CircleAlert size={16} className="shrink-0" /> {erro}
          </div>
        </div>
      )}

      {aba === "os" && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-2xl font-display text-slate-900">{abertas}</div>
              <div className="text-sm text-slate-500">Aguardando início</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-2xl font-display text-slate-900">{emAndamento}</div>
              <div className="text-sm text-slate-500">Em andamento</div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {["todas", ...Object.keys(STATUS)].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filter === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {key === "todas" ? "Todas" : STATUS[key].label}
              </button>
            ))}
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((o) => (
                <OrderTag key={o.id} o={o} onMudarStatus={onMudarStatus} processando={processando === o.apiId} />
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-slate-400 py-16">
                  Nenhuma ordem de serviço atribuída a você por enquanto.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {aba === "estoque" && <Estoque estoque={estoque} onCriado={onEstoqueCriado} podeExcluir={false} />}
    </div>
  );
}

/* ---------------------------------------------------------
   Clientes
--------------------------------------------------------- */

function ClientModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial
      ? { nome: initial.nome, doc: initial.doc === "—" ? "" : initial.doc, telefone: initial.telefone === "—" ? "" : initial.telefone, email: initial.email === "—" ? "" : initial.email, endereco: initial.endereco === "—" ? "" : initial.endereco, observacoes: "" }
      : { nome: "", doc: "", telefone: "", email: "", endereco: "", observacoes: "" }
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">{initial ? "Editar Cliente" : "Novo Cliente"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          {[
            { key: "nome", label: "Nome" },
            { key: "doc", label: "CPF/CNPJ" },
            { key: "telefone", label: "Telefone / WhatsApp" },
            { key: "email", label: "E-mail" },
            { key: "endereco", label: "Endereço" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={update(f.key)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={update("observacoes")}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : initial ? "Salvar alterações" : "Salvar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Clientes({ clients, onCriado }) {
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(null);
  const filtered = clients.filter((c) => c.nome.toLowerCase().includes(query.toLowerCase()) || c.telefone.includes(query));

  const excluir = async (cliente) => {
    if (!window.confirm(`Excluir o cliente "${cliente.nome}"? Essa ação não pode ser desfeita.`)) return;
    setProcessando(cliente.id);
    try {
      await clientesApi.remover(cliente.id);
      await onCriado();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente por nome ou telefone"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 text-xs font-medium text-slate-500 border-b border-slate-200 bg-slate-50">
          <div className="col-span-3">Cliente</div>
          <div className="col-span-2">Contato</div>
          <div className="col-span-3">Endereço</div>
          <div className="col-span-2">Veículos</div>
          <div className="col-span-1">Última visita</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((c) => (
            <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-5 py-4 text-sm items-center">
              <div className="md:col-span-3">
                <div className="text-slate-900 font-medium">{c.nome}</div>
                <div className="text-xs text-slate-400 font-plate">{c.doc}</div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <Phone size={12} /> {c.telefone}
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs truncate">
                  <Mail size={12} /> {c.email}
                </div>
              </div>
              <div className="md:col-span-3 flex items-center gap-1.5 text-slate-500 text-xs">
                <MapPin size={12} className="shrink-0" /> {c.endereco}
              </div>
              <div className="md:col-span-2 text-slate-600 text-xs">
                {c.veiculos} veículo{c.veiculos > 1 ? "s" : ""}
              </div>
              <div className="md:col-span-1 text-slate-400 text-xs">{c.ultimaVisita}</div>
              <div className="md:col-span-1 flex items-center justify-end gap-1">
                <button onClick={() => setEditando(c)} className="text-slate-400 hover:text-orange-600 p-1.5" title="Editar">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => excluir(c)}
                  disabled={processando === c.id}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-60 p-1.5"
                  title="Excluir"
                >
                  {processando === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center text-sm text-slate-400 py-10">Nenhum cliente encontrado.</div>}
        </div>
      </div>

      {showModal && (
        <ClientModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            await clientesApi.criar({
              nome: form.nome,
              cpfCnpj: form.doc || undefined,
              telefone: form.telefone || undefined,
              email: form.email || undefined,
              endereco: form.endereco || undefined,
              observacoes: form.observacoes || undefined,
            });
            await onCriado();
          }}
        />
      )}

      {editando && (
        <ClientModal
          initial={editando}
          onClose={() => setEditando(null)}
          onSave={async (form) => {
            await clientesApi.atualizar(editando.id, {
              nome: form.nome,
              cpfCnpj: form.doc || undefined,
              telefone: form.telefone || undefined,
              email: form.email || undefined,
              endereco: form.endereco || undefined,
              observacoes: form.observacoes || undefined,
            });
            await onCriado();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Veículos
--------------------------------------------------------- */

function VeiculoModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial
      ? {
          placa: initial.placa,
          marca: initial.marca === "—" ? "" : initial.marca,
          modelo: initial.modelo === "—" ? "" : initial.modelo,
          ano: initial.ano === "—" ? "" : String(initial.ano),
          cor: initial.cor === "—" ? "" : initial.cor,
          km: initial.km || "",
          cliente: initial.cliente === "—" ? "" : initial.cliente,
        }
      : { placa: "", marca: "", modelo: "", ano: "", cor: "", km: "", cliente: "" }
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    if (!form.placa.trim()) {
      setErro("Informe a placa.");
      return;
    }
    if (!form.cliente.trim()) {
      setErro("Informe o cliente proprietário.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">{initial ? "Editar Veículo" : "Novo Veículo"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          {[
            { key: "placa", label: "Placa" },
            { key: "marca", label: "Marca" },
            { key: "modelo", label: "Modelo" },
            { key: "ano", label: "Ano" },
            { key: "cor", label: "Cor" },
            { key: "km", label: "Quilometragem" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={update(f.key)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500">Cliente proprietário</label>
            <input
              value={form.cliente}
              onChange={update("cliente")}
              list="lista-clientes"
              placeholder="Digite o nome — não precisa já estar cadastrado"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
            <p className="text-xs text-slate-400 mt-1">Sugestões aparecem se o cliente já existir, mas você pode digitar qualquer nome.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : initial ? "Salvar alterações" : "Salvar veículo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Veiculos({ veiculos, resolverClienteId, onCriado }) {
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(null);
  const filtered = veiculos.filter(
    (v) => v.placa.toLowerCase().includes(query.toLowerCase()) || v.modelo.toLowerCase().includes(query.toLowerCase()) || v.cliente.toLowerCase().includes(query.toLowerCase())
  );

  const excluir = async (veiculo) => {
    if (!window.confirm(`Excluir o veículo de placa "${veiculo.placa}"? Essa ação não pode ser desfeita.`)) return;
    setProcessando(veiculo.id);
    try {
      await veiculosApi.remover(veiculo.id);
      await onCriado();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por placa, modelo ou cliente"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Novo Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                <Car size={18} />
              </div>
              <span className="font-plate text-xs tracking-wider bg-slate-900 text-white px-2 py-1 rounded">{v.placa}</span>
            </div>
            <div className="mt-3 text-slate-900 font-medium">
              {v.marca} {v.modelo}
            </div>
            <div className="text-sm text-slate-500">
              {v.ano} · {v.cor}
            </div>
            <div className="text-xs text-slate-400 mt-1">{v.km.toLocaleString("pt-BR")} km rodados</div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Proprietário</span>
              <span className="text-slate-900 font-medium">{v.cliente}</span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-2">
              <button onClick={() => setEditando(v)} className="text-slate-400 hover:text-orange-600 p-1.5" title="Editar">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => excluir(v)}
                disabled={processando === v.id}
                className="text-slate-400 hover:text-red-600 disabled:opacity-60 p-1.5"
                title="Excluir"
              >
                {processando === v.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-sm text-slate-400 py-10">Nenhum veículo encontrado.</div>}
      </div>

      {showModal && (
        <VeiculoModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            const clienteId = await resolverClienteId(form.cliente);
            await veiculosApi.criar({
              clienteId,
              placa: form.placa,
              marca: form.marca || undefined,
              modelo: form.modelo || undefined,
              ano: form.ano ? Number(form.ano) : undefined,
              cor: form.cor || undefined,
              km: form.km ? Number(form.km) : undefined,
            });
            await onCriado();
          }}
        />
      )}

      {editando && (
        <VeiculoModal
          initial={editando}
          onClose={() => setEditando(null)}
          onSave={async (form) => {
            const clienteId = await resolverClienteId(form.cliente);
            await veiculosApi.atualizar(editando.id, {
              clienteId,
              placa: form.placa,
              marca: form.marca || undefined,
              modelo: form.modelo || undefined,
              ano: form.ano ? Number(form.ano) : undefined,
              cor: form.cor || undefined,
              km: form.km ? Number(form.km) : undefined,
            });
            await onCriado();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Orçamentos
--------------------------------------------------------- */

function NovoOrcamentoModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(() => {
    if (!initial) return { cliente: "", veiculo: "", placa: "" };
    const partes = initial.veiculo.split(" — ");
    return { cliente: initial.cliente, veiculo: partes[0] || "", placa: partes[1] || "" };
  });
  const [itens, setItens] = useState(initial ? initial.itens.map((it) => ({ ...it })) : [{ tipo: "peca", nome: "", valor: "" }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const total = itens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);

  const handleSave = async () => {
    if (!form.cliente.trim()) {
      setErro("Informe o cliente.");
      return;
    }
    if (!form.veiculo.trim()) {
      setErro("Informe o veículo.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave({ ...form, itens });
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">{initial ? "Editar Orçamento" : "Novo Orçamento"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500">Cliente</label>
            <input
              value={form.cliente}
              onChange={update("cliente")}
              list="lista-clientes"
              placeholder="Digite o nome — não precisa já estar cadastrado"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Veículo</label>
              <input
                value={form.veiculo}
                onChange={update("veiculo")}
                list="lista-modelos"
                placeholder="Marca e modelo"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Placa</label>
              <input
                value={form.placa}
                onChange={update("placa")}
                list="lista-placas"
                placeholder="Obrigatória se for veículo novo"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          </div>
          <ItensEditor itens={itens} setItens={setItens} />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-display text-lg text-slate-900">{money(total)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : initial ? "Salvar alterações" : "Salvar orçamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Orcamentos({ orcamentos, resolverClienteId, resolverVeiculoId, onAtualizado }) {
  const [filter, setFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(null);
  const filtered = orcamentos.filter((o) => filter === "todos" || o.status === filter);

  const total = (itens) => itens.reduce((acc, it) => acc + (Number(it.valor) || 0), 0);

  const mudarStatus = async (o, novoStatus) => {
    setProcessando(o.apiId);
    try {
      await orcamentosApi.atualizarStatus(o.apiId, novoStatus);
      await onAtualizado();
    } finally {
      setProcessando(null);
    }
  };

  const converter = async (o) => {
    setProcessando(o.apiId);
    try {
      await orcamentosApi.converter(o.apiId);
      await onAtualizado();
    } finally {
      setProcessando(null);
    }
  };

  const excluir = async (o) => {
    if (!window.confirm(`Excluir o orçamento ${o.id}? Essa ação não pode ser desfeita.`)) return;
    setProcessando(o.apiId);
    try {
      await orcamentosApi.remover(o.apiId);
      await onAtualizado();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["todos", ...Object.keys(ORCAMENTO_STATUS)].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {key === "todos" ? "Todos" : ORCAMENTO_STATUS[key].label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Novo Orçamento
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((o) => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-plate text-sm text-slate-500">{o.id}</div>
                <div className="text-slate-900 font-medium">{o.cliente}</div>
                <div className="text-sm text-slate-500">{o.veiculo}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip status={o.status} map={ORCAMENTO_STATUS} />
                <button onClick={() => setEditando(o)} className="text-slate-400 hover:text-orange-600 p-1.5" title="Editar">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => excluir(o)}
                  disabled={processando === o.apiId}
                  className="text-slate-400 hover:text-red-600 disabled:opacity-60 p-1.5"
                  title="Excluir"
                >
                  {processando === o.apiId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              {o.itens.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-600">
                    {it.nome}
                    <span className="text-xs text-slate-400 ml-2">{it.tipo === "peca" ? "peça" : "mão de obra"}</span>
                  </span>
                  <span className="text-slate-900">{money(it.valor)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-lg font-display text-slate-900">{money(total(o.itens))}</span>
            </div>
            {o.status === "pendente" && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => mudarStatus(o, "APROVADO")}
                  disabled={processando === o.apiId}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
                >
                  Aprovar
                </button>
                <button
                  onClick={() => mudarStatus(o, "REPROVADO")}
                  disabled={processando === o.apiId}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Reprovar
                </button>
              </div>
            )}
            {o.status === "aprovado" && (
              <button
                onClick={() => converter(o)}
                disabled={o.convertido || processando === o.apiId}
                className={`mt-3 w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                  o.convertido ? "bg-emerald-50 text-emerald-700 cursor-default" : "bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white"
                }`}
              >
                {processando === o.apiId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : o.convertido ? (
                  <>
                    <Check size={16} /> Convertido em Ordem de Serviço
                  </>
                ) : (
                  <>
                    Converter em Ordem de Serviço <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center text-sm text-slate-400 py-10">Nenhum orçamento encontrado.</div>}
      </div>

      {showModal && (
        <NovoOrcamentoModal
          onClose={() => setShowModal(false)}
          onSave={async ({ cliente, veiculo, placa, itens }) => {
            const clienteId = await resolverClienteId(cliente);
            const veiculoId = await resolverVeiculoId({ clienteId, placa, veiculoTexto: veiculo });
            const itensValidos = itens
              .filter((it) => it.nome.trim())
              .map((it) => ({
                tipo: it.tipo === "peca" ? "PECA" : "MAO_DE_OBRA",
                descricao: it.nome,
                quantidade: 1,
                valorUnitario: Number(it.valor) || 0,
              }));
            await orcamentosApi.criar({ clienteId, veiculoId, itens: itensValidos });
            await onAtualizado();
          }}
        />
      )}

      {editando && (
        <NovoOrcamentoModal
          initial={editando}
          onClose={() => setEditando(null)}
          onSave={async ({ cliente, veiculo, placa, itens }) => {
            const clienteId = await resolverClienteId(cliente);
            const veiculoId = await resolverVeiculoId({ clienteId, placa, veiculoTexto: veiculo });
            const itensValidos = itens
              .filter((it) => it.nome.trim())
              .map((it) => ({
                tipo: it.tipo === "peca" ? "PECA" : "MAO_DE_OBRA",
                descricao: it.nome,
                quantidade: 1,
                valorUnitario: Number(it.valor) || 0,
              }));
            await orcamentosApi.atualizar(editando.apiId, { clienteId, veiculoId, itens: itensValidos });
            await onAtualizado();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Estoque
--------------------------------------------------------- */

function MaterialModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(
    initial
      ? {
          codigo: initial.codigo,
          nome: initial.nome,
          categoria: initial.categoria === "—" ? CATEGORIAS_ESTOQUE[0] : initial.categoria,
          fornecedor: initial.fornecedor === "—" ? "" : initial.fornecedor,
          quantidade: String(initial.quantidade),
          minimo: String(initial.minimo),
          valorCompra: String(initial.valorCompra),
          valorVenda: String(initial.valorVenda),
        }
      : { codigo: "", nome: "", categoria: CATEGORIAS_ESTOQUE[0], fornecedor: "", quantidade: "", minimo: "", valorCompra: "", valorVenda: "" }
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    if (!form.codigo.trim()) {
      setErro("Informe o código.");
      return;
    }
    if (!form.nome.trim()) {
      setErro("Informe o nome do item.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">{initial ? "Editar Item de Estoque" : "Novo Item de Estoque"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          <p className="text-xs text-slate-400 -mt-1">
            Vale para peças mecânicas, tintas, massa, lixas ou qualquer outro material usado na oficina.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Código</label>
              <input
                value={form.codigo}
                onChange={update("codigo")}
                placeholder="PC-0001"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Categoria</label>
              <select
                value={form.categoria}
                onChange={update("categoria")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              >
                {CATEGORIAS_ESTOQUE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Nome do item</label>
            <input
              value={form.nome}
              onChange={update("nome")}
              placeholder="Ex: Tinta base preto sólido (L)"
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fornecedor</label>
            <input
              value={form.fornecedor}
              onChange={update("fornecedor")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Quantidade</label>
              <input
                type="number"
                min="0"
                value={form.quantidade}
                onChange={update("quantidade")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Estoque mínimo</label>
              <input
                type="number"
                min="0"
                value={form.minimo}
                onChange={update("minimo")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Valor de compra</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valorCompra}
                onChange={update("valorCompra")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Valor de venda</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valorVenda}
                onChange={update("valorVenda")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : initial ? "Salvar alterações" : "Salvar item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Estoque({ estoque, onCriado, podeExcluir = true }) {
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [processando, setProcessando] = useState(null);
  const filtered = estoque.filter((p) => p.nome.toLowerCase().includes(query.toLowerCase()) || p.codigo.toLowerCase().includes(query.toLowerCase()));
  const baixoEstoque = estoque.filter((p) => p.quantidade <= p.minimo);

  const excluir = async (item) => {
    if (!window.confirm(`Excluir "${item.nome}" do estoque? Essa ação não pode ser desfeita.`)) return;
    setProcessando(item.id);
    try {
      await estoqueApi.remover(item.id);
      await onCriado();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      {baixoEstoque.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <CircleAlert size={18} className="shrink-0" />
          <span>
            <strong>{baixoEstoque.length}</strong> {baixoEstoque.length > 1 ? "itens estão" : "item está"} abaixo do estoque mínimo.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar peça, tinta ou material por nome ou código"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Novo Item
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="text-left font-medium px-5 py-3">Código</th>
              <th className="text-left font-medium px-5 py-3">Peça / Material</th>
              <th className="text-left font-medium px-5 py-3">Categoria</th>
              <th className="text-left font-medium px-5 py-3">Fornecedor</th>
              <th className="text-right font-medium px-5 py-3">Qtd.</th>
              <th className="text-right font-medium px-5 py-3">Valor venda</th>
              <th className="text-right font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const low = p.quantidade <= p.minimo;
              return (
                <tr key={p.id} className={low ? "bg-red-50/60" : ""}>
                  <td className="px-5 py-3 font-plate text-slate-500">{p.codigo}</td>
                  <td className="px-5 py-3 text-slate-900">{p.nome}</td>
                  <td className="px-5 py-3 text-slate-500">{p.categoria}</td>
                  <td className="px-5 py-3 text-slate-500">{p.fornecedor}</td>
                  <td className={`px-5 py-3 text-right font-medium ${low ? "text-red-600" : "text-slate-900"}`}>
                    {p.quantidade}
                    {low && <span className="text-xs font-normal text-red-500 ml-1">(mín. {p.minimo})</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">{money(p.valorVenda)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditando(p)} className="text-slate-400 hover:text-orange-600 p-1.5" title="Editar">
                        <Pencil size={14} />
                      </button>
                      {podeExcluir && (
                        <button
                          onClick={() => excluir(p)}
                          disabled={processando === p.id}
                          className="text-slate-400 hover:text-red-600 disabled:opacity-60 p-1.5"
                          title="Excluir"
                        >
                          {processando === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-sm text-slate-400 py-10">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <MaterialModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            await estoqueApi.criar({
              codigo: form.codigo,
              nome: form.nome,
              categoria: form.categoria,
              fornecedor: form.fornecedor || undefined,
              quantidade: Number(form.quantidade) || 0,
              estoqueMinimo: Number(form.minimo) || 0,
              valorCompra: Number(form.valorCompra) || 0,
              valorVenda: Number(form.valorVenda) || 0,
            });
            await onCriado();
          }}
        />
      )}

      {editando && (
        <MaterialModal
          initial={editando}
          onClose={() => setEditando(null)}
          onSave={async (form) => {
            await estoqueApi.atualizar(editando.id, {
              codigo: form.codigo,
              nome: form.nome,
              categoria: form.categoria,
              fornecedor: form.fornecedor || undefined,
              quantidade: Number(form.quantidade) || 0,
              estoqueMinimo: Number(form.minimo) || 0,
              valorCompra: Number(form.valorCompra) || 0,
              valorVenda: Number(form.valorVenda) || 0,
            });
            await onCriado();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Financeiro
--------------------------------------------------------- */

function ContaModal({ tipo, onClose, onSave }) {
  const [form, setForm] = useState({ fornecedor: "", descricao: "", valor: "", vencimento: "", categoria: "VARIAVEL" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    if (tipo === "pagar" && !form.fornecedor.trim()) {
      setErro("Informe o fornecedor.");
      return;
    }
    if (!form.descricao.trim()) {
      setErro("Informe a descrição.");
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!form.vencimento) {
      setErro("Informe a data de vencimento.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">
            {tipo === "receber" ? "Nova Conta a Receber" : "Nova Conta a Pagar"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          {tipo === "pagar" && (
            <div>
              <label className="text-xs font-medium text-slate-500">Fornecedor</label>
              <input
                value={form.fornecedor}
                onChange={update("fornecedor")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          )}
          {tipo === "pagar" && (
            <div>
              <label className="text-xs font-medium text-slate-500">Categoria</label>
              <select
                value={form.categoria}
                onChange={update("categoria")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              >
                <option value="FIXA">Custo fixo (aluguel, salário, internet...)</option>
                <option value="VARIAVEL">Custo variável (peça avulsa, manutenção pontual...)</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500">Descrição</label>
            <input
              value={form.descricao}
              onChange={update("descricao")}
              placeholder={tipo === "receber" ? "Ex: Venda de peça avulsa" : "Ex: Conta de energia"}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Valor</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valor}
                onChange={update("valor")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Vencimento</label>
              <input
                type="date"
                value={form.vencimento}
                onChange={update("vencimento")}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : "Salvar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Financeiro() {
  const [tab, setTab] = useState("receber");
  const [contasReceber, setContasReceber] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [indicadores, setIndicadores] = useState({ receita: 0, despesa: 0, lucro: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const [receberData, pagarData, indicadoresData] = await Promise.all([
        financeiroApi.listarReceber(),
        financeiroApi.listarPagar(),
        financeiroApi.indicadores(),
      ]);
      setContasReceber(receberData.map(mapContaReceber));
      setContasPagar(pagarData.map(mapContaPagar));
      setIndicadores(indicadoresData);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marcarComoPago = async (conta) => {
    setProcessando(conta.id);
    try {
      if (tab === "receber") await financeiroApi.pagarReceber(conta.id);
      else await financeiroApi.pagarPagar(conta.id);
      await carregar();
    } finally {
      setProcessando(null);
    }
  };

  const [cobrandoId, setCobrandoId] = useState(null);
  const [mensagemCobranca, setMensagemCobranca] = useState("");

  const cobrarPorWhatsapp = async (conta) => {
    setCobrandoId(conta.id);
    setMensagemCobranca("");
    try {
      const resultado = await financeiroApi.cobrarReceber(conta.id);
      setMensagemCobranca(
        resultado.simulado
          ? "Cobrança simulada (configure o Z-API no backend para enviar de verdade)."
          : "Cobrança enviada por WhatsApp!"
      );
    } catch (err) {
      setMensagemCobranca(err.message);
    } finally {
      setCobrandoId(null);
    }
  };

  const lista = tab === "receber" ? contasReceber : contasPagar;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}
      {mensagemCobranca && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-4 py-3">
          <MessageCircle size={16} className="shrink-0" /> {mensagemCobranca}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <TrendingUp size={18} />
          </div>
          <div className="text-xl font-display text-slate-900">{money(indicadores.receita)}</div>
          <div className="text-sm text-slate-500">Receita (contas pagas)</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-md bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <TrendingDown size={18} />
          </div>
          <div className="text-xl font-display text-slate-900">{money(indicadores.despesa)}</div>
          <div className="text-sm text-slate-500">Despesas (contas pagas)</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="w-9 h-9 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
            <DollarSign size={18} />
          </div>
          <div className="text-xl font-display text-slate-900">{money(indicadores.lucro)}</div>
          <div className="text-sm text-slate-500">Lucro</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pr-4">
          <div className="flex">
            <button
              onClick={() => setTab("receber")}
              className={`px-5 py-3 text-sm font-medium ${tab === "receber" ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-500"}`}
            >
              Contas a Receber
            </button>
            <button
              onClick={() => setTab("pagar")}
              className={`px-5 py-3 text-sm font-medium ${tab === "pagar" ? "text-orange-600 border-b-2 border-orange-600" : "text-slate-500"}`}
            >
              Contas a Pagar
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-1.5 rounded-md shrink-0"
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {lista.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm gap-3">
              <div className="min-w-0">
                <div className="text-slate-900 font-medium truncate">{c.cliente || c.fornecedor}</div>
                <div className="text-xs text-slate-500 truncate">{c.descricao}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-slate-900">{money(c.valor)}</div>
                <div className="text-xs text-slate-400">Venc. {c.vencimento}</div>
              </div>
              {c.status === "pago" ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                  Pago
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  {tab === "receber" && (
                    <button
                      onClick={() => cobrarPorWhatsapp(c)}
                      disabled={cobrandoId === c.id}
                      title="Enviar cobrança por WhatsApp"
                      className="text-emerald-600 hover:text-emerald-700 disabled:opacity-60 p-1.5 border border-emerald-200 rounded-full bg-emerald-50 hover:bg-emerald-100"
                    >
                      {cobrandoId === c.id ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                    </button>
                  )}
                  <button
                    onClick={() => marcarComoPago(c)}
                    disabled={processando === c.id}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 disabled:opacity-60"
                  >
                    {processando === c.id ? "..." : "Marcar como pago"}
                  </button>
                </div>
              )}
            </div>
          ))}
          {lista.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-10">
              Nenhuma conta {tab === "receber" ? "a receber" : "a pagar"} ainda.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ContaModal
          tipo={tab}
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            if (tab === "receber") {
              await financeiroApi.criarReceber({ descricao: form.descricao, valor: Number(form.valor), vencimento: form.vencimento });
            } else {
              await financeiroApi.criarPagar({
                fornecedor: form.fornecedor,
                descricao: form.descricao,
                valor: Number(form.valor),
                tipo: form.categoria,
                vencimento: form.vencimento,
              });
            }
            await carregar();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Equipe
--------------------------------------------------------- */

function MembroModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cargo: "", perfil: "MECANICO" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    if (!form.nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    if (!form.email.trim()) {
      setErro("Informe o e-mail.");
      return;
    }
    if (form.senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-display text-lg text-slate-900">Novo Membro da Equipe</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              <CircleAlert size={16} className="shrink-0" /> {erro}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-500">Nome</label>
            <input
              value={form.nome}
              onChange={update("nome")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">E-mail (usado para fazer login)</label>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Senha provisória (mínimo 6 caracteres)</label>
            <input
              type="password"
              value={form.senha}
              onChange={update("senha")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Cargo</label>
            <input
              value={form.cargo}
              onChange={update("cargo")}
              list="lista-cargos"
              placeholder="Ex: Pintor, Funileiro, Ajudante, Mecânico Preparador..."
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
            <datalist id="lista-cargos">
              {CARGOS_SUGERIDOS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-slate-400 mt-1">Digite qualquer função — a lista é só uma sugestão.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Nível de acesso</label>
            <select
              value={form.perfil}
              onChange={update("perfil")}
              className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            >
              {Object.entries(PERFIL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={salvando}
            className="px-4 py-2 text-sm rounded-md bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium inline-flex items-center gap-2"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            {salvando ? "Salvando..." : "Adicionar membro"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Equipe({ equipe, onCriado }) {
  const [showModal, setShowModal] = useState(false);
  const [processando, setProcessando] = useState(null);

  const alternarAtivo = async (membro) => {
    setProcessando(membro.id);
    try {
      await usuariosApi.atualizar(membro.id, { ativo: !membro.ativo });
      await onCriado();
    } finally {
      setProcessando(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 max-w-md">
          Quem faz parte da oficina — mecânicos, pintores, funileiros, atendentes. Use essa lista para atribuir o
          responsável em cada Ordem de Serviço.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md shrink-0"
        >
          <Plus size={16} /> Novo Membro
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {equipe.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-5 py-4 text-sm">
              <div>
                <div className="text-slate-900 font-medium flex items-center gap-2">
                  {m.nome}
                  {!m.ativo && <span className="text-xs text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Inativo</span>}
                </div>
                <div className="text-xs text-slate-500">{m.cargo || "Cargo não informado"} · {m.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    m.perfil === "MECANICO" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {PERFIL_BADGE[m.perfil] || m.perfil}
                </span>
                <button
                  onClick={() => alternarAtivo(m)}
                  disabled={processando === m.id}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60"
                >
                  {m.ativo ? "Desativar" : "Reativar"}
                </button>
              </div>
            </div>
          ))}
          {equipe.length === 0 && <div className="text-center text-sm text-slate-400 py-10">Nenhum membro cadastrado ainda.</div>}
        </div>
      </div>

      {showModal && (
        <MembroModal
          onClose={() => setShowModal(false)}
          onSave={async (form) => {
            await usuariosApi.criar(form);
            await onCriado();
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Assinatura
--------------------------------------------------------- */

const RECURSOS_LABELS = {
  clientes: "Cadastro de clientes",
  veiculos: "Cadastro de veículos",
  ordens_servico: "Ordens de serviço",
  orcamentos: "Orçamentos",
  estoque: "Controle de estoque",
  financeiro: "Financeiro completo",
  whatsapp: "WhatsApp integrado",
  ia: "Recursos de IA",
  relatorios_avancados: "Relatórios avançados",
};

function Assinatura() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [form, setForm] = useState({ planoId: "", cnpj: "", telefone: "", diaVencimento: "10" });
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const data = await assinaturaApi.obter();
      setDados(data);
      setForm((f) => ({
        ...f,
        planoId: data.assinatura?.planoId || data.planos[1]?.id || data.planos[0]?.id || "",
        cnpj: data.oficina.cnpj || "",
        telefone: data.oficina.telefone || "",
      }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assinar = async (e) => {
    e.preventDefault();
    setErro("");
    setProcessando(true);
    setResultado(null);
    try {
      const resp = await assinaturaApi.assinar({ ...form, diaVencimento: Number(form.diaVencimento) });
      setResultado(resp);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    if (!window.confirm("Cancelar sua assinatura? Você perde acesso ao sistema assim que o período atual terminar.")) return;
    setProcessando(true);
    setErro("");
    try {
      await assinaturaApi.cancelar();
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setProcessando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-orange-600" />
      </div>
    );
  }

  const assinaturaAtiva = dados?.assinatura?.status === "ATIVA";
  const statusLabel = {
    TRIAL: { label: "Período de teste", chip: "bg-blue-100 text-blue-700 border-blue-200" },
    ATIVA: { label: "Ativa", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    INADIMPLENTE: { label: "Pagamento em atraso", chip: "bg-red-100 text-red-700 border-red-200" },
    CANCELADA: { label: "Cancelada", chip: "bg-slate-200 text-slate-600 border-slate-300" },
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl space-y-6">
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}

      {dados?.assinatura && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-500">Plano atual</span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                statusLabel[dados.assinatura.status]?.chip || "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {statusLabel[dados.assinatura.status]?.label || dados.assinatura.status}
            </span>
          </div>
          <div className="font-display text-2xl text-slate-900">{dados.assinatura.plano?.nome}</div>
          <div className="text-slate-500 text-sm mt-1">{money(Number(dados.assinatura.plano?.precoMensal || 0))} / mês</div>
          {dados.assinatura.currentPeriodEnd && (
            <div className="text-xs text-slate-400 mt-2">
              Próximo vencimento: {new Date(dados.assinatura.currentPeriodEnd).toLocaleDateString("pt-BR")}
            </div>
          )}
          {dados.oficina.trialEndsAt && dados.assinatura.status === "TRIAL" && (
            <div className="text-xs text-amber-600 mt-2">
              Teste grátis até {new Date(dados.oficina.trialEndsAt).toLocaleDateString("pt-BR")}
            </div>
          )}
          {assinaturaAtiva && (
            <button
              onClick={cancelar}
              disabled={processando}
              className="mt-4 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
            >
              {processando ? "Cancelando..." : "Cancelar assinatura"}
            </button>
          )}
        </div>
      )}

      {!assinaturaAtiva && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="font-display text-lg text-slate-900 mb-1">
            {dados?.assinatura?.status === "CANCELADA" ? "Reativar assinatura" : "Assinar agora"}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            A cobrança é feita por boleto, enviado automaticamente por e-mail todo mês. Você pode cancelar quando quiser.
          </p>

          {resultado && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-3 py-2 mb-4">
              <Check size={16} className="shrink-0 mt-0.5" />
              <span>
                Assinatura criada! O boleto foi enviado para o e-mail cadastrado.
                {resultado.boletoUrl && (
                  <>
                    {" "}
                    <a href={resultado.boletoUrl} target="_blank" rel="noreferrer" className="underline font-medium">
                      Ver boleto
                    </a>
                  </>
                )}
                {resultado.simulado && (
                  <span className="block text-xs text-emerald-600 mt-1">
                    (Modo de teste: nenhuma cobrança real foi gerada — configure ASAAS_API_KEY no backend para ativar de verdade.)
                  </span>
                )}
              </span>
            </div>
          )}

          <form onSubmit={assinar} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Plano</label>
              <select
                value={form.planoId}
                onChange={update("planoId")}
                required
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              >
                {dados?.planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {money(Number(p.precoMensal))}/mês
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">CPF ou CNPJ</label>
              <input
                value={form.cnpj}
                onChange={update("cnpj")}
                required
                placeholder="Necessário para emitir o boleto"
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={update("telefone")}
                  required
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Dia de vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={form.diaVencimento}
                  onChange={update("diaVencimento")}
                  required
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={processando}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm mt-2 inline-flex items-center justify-center gap-2"
            >
              {processando && <Loader2 size={16} className="animate-spin" />}
              {processando ? "Processando..." : "Confirmar assinatura"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Relatório Anual
--------------------------------------------------------- */

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const LINHAS_RELATORIO = [
  { key: "faturamento", label: "Faturamento", tipo: "moeda" },
  { key: "receita", label: "Receita", tipo: "moeda" },
  { key: "custosFixos", label: "Custos Fixos", tipo: "moeda" },
  { key: "custosVariaveis", label: "Custos Variáveis", tipo: "moeda" },
  { key: "dividas", label: "Dívidas em Aberto", tipo: "moeda" },
  { key: "lucro", label: "Lucro", tipo: "moeda", destaque: true },
  { key: "ticketMedio", label: "Ticket Médio por Carro", tipo: "moeda" },
  { key: "margemLucro", label: "Margem de Lucro", tipo: "percentual" },
];

function RelatorioAnual() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = async (anoConsulta) => {
    setCarregando(true);
    setErro("");
    try {
      const data = await financeiroApi.relatorioAnual(anoConsulta);
      setDados(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar(ano);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano]);

  const formatarValor = (valor, tipo) => (tipo === "percentual" ? `${(valor || 0).toFixed(1)}%` : money(valor || 0));

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 max-w-md">
          Visão mês a mês do ano inteiro — faturamento, receita, custos, dívidas, lucro, ticket médio e margem, calculados
          a partir dos dados reais do sistema.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAno((a) => a - 1)}
            className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center"
          >
            ‹
          </button>
          <span className="font-display text-lg text-slate-900 w-14 text-center">{ano}</span>
          <button
            onClick={() => setAno((a) => a + 1)}
            disabled={ano >= anoAtual}
            className="w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center"
          >
            ›
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-orange-600" />
        </div>
      ) : (
        dados && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="text-left font-medium px-4 py-3 sticky left-0 bg-slate-50">Relatório</th>
                  {MESES_ABREV.map((m) => (
                    <th key={m} className="text-right font-medium px-3 py-3 whitespace-nowrap">
                      {m}
                    </th>
                  ))}
                  <th className="text-right font-medium px-4 py-3 whitespace-nowrap bg-orange-50 text-orange-700">Total Anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {LINHAS_RELATORIO.map((linha) => (
                  <tr key={linha.key} className={linha.destaque ? "bg-emerald-50/40" : ""}>
                    <td
                      className={`px-4 py-3 whitespace-nowrap sticky left-0 ${linha.destaque ? "bg-emerald-50/40" : "bg-white"} ${
                        linha.destaque ? "font-semibold text-emerald-800" : "font-medium text-slate-700"
                      }`}
                    >
                      {linha.label}
                    </td>
                    {dados.meses.map((m, i) => (
                      <td
                        key={i}
                        className={`text-right px-3 py-3 whitespace-nowrap ${linha.destaque ? "font-semibold text-emerald-700" : "text-slate-600"}`}
                      >
                        {formatarValor(m[linha.key], linha.tipo)}
                      </td>
                    ))}
                    <td
                      className={`text-right px-4 py-3 whitespace-nowrap font-semibold bg-orange-50 ${
                        linha.destaque ? "text-emerald-700" : "text-orange-700"
                      }`}
                    >
                      {formatarValor(dados.totalAnual[linha.key], linha.tipo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Landing page
--------------------------------------------------------- */

const HERO_STATUS_SEQUENCE = ["aberta", "andamento", "pecas", "aprovacao", "finalizada", "entregue"];

function HeroDemo() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HERO_STATUS_SEQUENCE.length), 2200);
    return () => clearInterval(t);
  }, []);
  const demoOrder = {
    id: "OS-2026",
    cliente: "Sua oficina, ao vivo",
    veiculo: "Toyota Corolla",
    placa: "TRQ-2026",
    mecanico: "Equipe",
    status: HERO_STATUS_SEQUENCE[idx],
    data: "hoje",
    valor: 1180,
  };
  return (
    <div className="w-full max-w-xs mx-auto lg:mx-0">
      <OrderTag o={demoOrder} />
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {HERO_STATUS_SEQUENCE.map((s, i) => (
          <span key={s} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-orange-500" : "w-1.5 bg-slate-200"}`} />
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: "Clientes", desc: "Histórico completo de cada cliente e seus veículos, sempre à mão." },
  { icon: ClipboardList, title: "Ordens de Serviço", desc: "Abra, acompanhe e finalize OS com fotos, assinatura e status em tempo real." },
  { icon: FileText, title: "Orçamentos", desc: "Monte orçamentos com peças e mão de obra e converta em OS com um clique." },
  { icon: Package, title: "Estoque", desc: "Baixa automática de peças na OS e alerta antes de faltar no balcão." },
  { icon: Wallet, title: "Financeiro", desc: "Contas a pagar, a receber e fluxo de caixa sem depender de planilha." },
  { icon: Car, title: "Veículos", desc: "Ficha técnica e histórico de manutenção de cada carro que passa pela oficina." },
  { icon: MessageCircle, title: "WhatsApp", desc: "Envie orçamentos, avisos de veículo pronto e cobranças direto pelo WhatsApp." },
  { icon: Zap, title: "IA da oficina", desc: "Sugestões de manutenção futura e apoio na montagem de orçamentos." },
];

const PLANS = [
  { name: "Básico", price: "R$ 79", desc: "Para quem está começando a organizar a oficina.", features: ["Até 2 usuários", "Clientes e veículos", "Ordens de serviço", "Suporte por e-mail"] },
  { name: "Profissional", price: "R$ 149", desc: "O mais escolhido por oficinas em crescimento.", features: ["Até 6 usuários", "Orçamentos e estoque", "Financeiro completo", "WhatsApp integrado", "Suporte prioritário"], highlight: true },
  { name: "Premium", price: "R$ 249", desc: "Para redes e oficinas com alto volume de OS.", features: ["Usuários ilimitados", "Recursos de IA", "Relatórios avançados", "Gerente de conta dedicado"] },
];

const TESTIMONIALS = [
  { nome: "Wesley Andrade", oficina: "Oficina Andrade Motors", texto: "Parei de perder orçamento em papel. Hoje cada OS tem histórico e o cliente recebe tudo pelo WhatsApp." },
  { nome: "Patrícia Gomes", oficina: "PG Auto Center", texto: "O alerta de estoque baixo já evitou pelo menos três vezes de eu perder um serviço por falta de peça." },
  { nome: "Elias Tavares", oficina: "Tavares Diesel", texto: "Consigo ver o faturamento do mês em segundos. Antes isso levava uma tarde inteira de planilha." },
];

const FAQ = [
  { q: "Preciso instalar algo na oficina?", a: "Não. O sistema funciona pelo navegador, em qualquer computador, tablet ou celular conectado à internet." },
  { q: "Meus dados ficam separados dos de outras oficinas?", a: "Sim. Cada oficina tem seus dados totalmente isolados dentro da plataforma, com login próprio." },
  { q: "Posso cancelar quando quiser?", a: "Sim, a assinatura pode ser cancelada a qualquer momento, sem multa ou fidelidade." },
  { q: "O teste grátis pede cartão de crédito?", a: "Não. Você testa por 7 dias com todos os recursos do plano escolhido, sem compromisso." },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="font-medium text-slate-900">{item.q}</span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.a}</p>}
    </div>
  );
}

function Landing({ goLogin, goSignup }) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <span className="font-display text-xl tracking-wide">
              TORQUE<span className="text-orange-600">OS</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#recursos" className="hover:text-slate-900">Recursos</a>
            <a href="#planos" className="hover:text-slate-900">Planos</a>
            <a href="#depoimentos" className="hover:text-slate-900">Depoimentos</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goLogin} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">
              <LogIn size={16} /> Entrar
            </button>
            <button onClick={goSignup} className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md">
              Teste grátis
            </button>
          </div>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-xs font-medium tracking-wider uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full mb-4">
            Feito para oficinas mecânicas
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-5">
            Sua oficina, do orçamento à entrega, <span className="text-orange-600">sob controle total.</span>
          </h1>
          <p className="text-slate-500 text-lg mb-8 max-w-md">
            Clientes, veículos, ordens de serviço, estoque e financeiro em um único sistema — acompanhando cada OS em tempo real, como a etiqueta ao lado.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={goSignup} className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-3 rounded-md">
              Começar teste grátis de 7 dias <ArrowRight size={18} />
            </button>
            <button onClick={goLogin} className="inline-flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-700 font-medium px-6 py-3 rounded-md">
              Já tenho conta
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs text-center lg:text-left text-slate-400 mb-3 uppercase tracking-wider">Acompanhamento de OS em tempo real</div>
          <HeroDemo />
        </div>
      </header>

      <section id="recursos" className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-display text-3xl mb-2">Tudo que a oficina precisa, em um só lugar</h2>
        <p className="text-slate-500 mb-10 max-w-lg">Sem planilha espalhada, sem caderno de anotação. Cada módulo conversa com o outro.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="border border-slate-200 rounded-lg p-5 hover:border-orange-200 hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                  <Icon size={18} />
                </div>
                <div className="font-medium text-slate-900 mb-1">{f.title}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="planos" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-3xl mb-2">Planos para cada tamanho de oficina</h2>
          <p className="text-slate-500 mb-10 max-w-lg">Comece com o Básico e mude de plano quando sua oficina crescer.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-lg p-6 bg-white ${p.highlight ? "border-2 border-orange-500 shadow-md relative" : "border border-slate-200"}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 bg-orange-600 text-white text-xs font-medium px-3 py-1 rounded-full">Mais popular</span>
                )}
                <div className="font-display text-xl mb-1">{p.name}</div>
                <div className="text-sm text-slate-500 mb-4">{p.desc}</div>
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-display text-slate-900">{p.price}</span>
                  <span className="text-slate-400 text-sm">/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check size={16} className="text-emerald-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={goSignup}
                  className={`w-full py-2.5 rounded-md text-sm font-medium ${
                    p.highlight ? "bg-orange-600 hover:bg-orange-700 text-white" : "border border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  Testar grátis
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="depoimentos" className="max-w-6xl mx-auto px-5 py-20">
        <h2 className="font-display text-3xl mb-2">Quem usa, recomenda</h2>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {TESTIMONIALS.map((t) => (
            <div key={t.nome} className="border border-slate-200 rounded-lg p-6">
              <div className="flex gap-0.5 mb-3 text-orange-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">"{t.texto}"</p>
              <div className="text-sm font-medium text-slate-900">{t.nome}</div>
              <div className="text-xs text-slate-400">{t.oficina}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mt-8">
          <ShieldCheck size={16} /> Dados isolados por oficina, com backup automático.
        </div>
      </section>

      <section id="faq" className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="font-display text-3xl mb-8">Perguntas frequentes</h2>
          <div>
            {FAQ.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-display text-lg text-white">
              TORQUE<span className="text-orange-500">OS</span>
            </div>
            <div className="text-sm mt-1">Sistema de gestão para oficinas mecânicas.</div>
          </div>
          <button onClick={goSignup} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            <MessageCircle size={16} /> Falar no WhatsApp
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-5 mt-8 pt-6 border-t border-slate-800 text-xs">© 2026 TorqueOS. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------
   Login / Cadastro
--------------------------------------------------------- */

function AuthShell({ children, goLanding }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <button onClick={goLanding} className="flex items-center gap-2 mb-8 mx-auto">
          <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <span className="font-display text-xl tracking-wide text-slate-900">
            TORQUE<span className="text-orange-600">OS</span>
          </span>
        </button>
        <div className="bg-white border border-slate-200 rounded-lg p-6">{children}</div>
      </div>
    </div>
  );
}


function Login({ goSignup, goLanding, goForgot, onSuccess, mensagemSucesso }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const data = await authApi.login({ email, senha });

      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      localStorage.setItem("oficina", JSON.stringify(data.oficina));

      onSuccess(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthShell goLanding={goLanding}>
      <h1 className="font-display text-2xl text-slate-900 mb-1">Entrar</h1>
      <p className="text-sm text-slate-500 mb-6">Acesse o painel da sua oficina.</p>
      {mensagemSucesso && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-md px-3 py-2 mb-4">
          <Check size={16} className="shrink-0" /> {mensagemSucesso}
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">Senha</label>
            <button type="button" onClick={goForgot} className="text-xs font-medium text-orange-600 hover:text-orange-700">
              Esqueci minha senha
            </button>
          </div>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm mt-2 inline-flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-slate-500 text-center mt-5">
        Não tem conta?{" "}
        <button onClick={goSignup} className="text-orange-600 font-medium">
          Criar conta
        </button>
      </p>
    </AuthShell>
  );
}

function ForgotPassword({ goLogin, goLanding, onSubmit }) {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErro("");
    setCarregando(true);
    try {
      await authApi.forgotPassword(email);
      onSubmit(email);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthShell goLanding={goLanding}>
      <h1 className="font-display text-2xl text-slate-900 mb-1">Esqueci minha senha</h1>
      <p className="text-sm text-slate-500 mb-6">Informe seu e-mail e enviaremos um código de 6 dígitos para redefinir a senha.</p>
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm mt-2 inline-flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? "Enviando..." : "Enviar código"}
        </button>
      </form>
      <p className="text-sm text-slate-500 text-center mt-5">
        Lembrou a senha?{" "}
        <button onClick={goLogin} className="text-orange-600 font-medium">
          Voltar para o login
        </button>
      </p>
    </AuthShell>
  );
}

function ResetPassword({ email, goLogin, goLanding, goForgot, onSuccess }) {
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (codigo.trim().length !== 6) {
      setErro("O código tem 6 dígitos.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      await authApi.resetPassword({ email, codigo, novaSenha: senha });
      onSuccess();
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthShell goLanding={goLanding}>
      <h1 className="font-display text-2xl text-slate-900 mb-1">Redefinir senha</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enviamos um código para <span className="text-slate-700 font-medium">{email}</span>. Ele vale por 15 minutos.
      </p>
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Código de 6 dígitos</label>
          <input
            inputMode="numeric"
            maxLength={6}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm text-center tracking-[0.5em] font-plate focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Nova senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Confirmar nova senha</label>
          <input
            type="password"
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm mt-2 inline-flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? "Redefinindo..." : "Redefinir senha"}
        </button>
      </form>
      <p className="text-sm text-slate-500 text-center mt-5">
        Não recebeu o código?{" "}
        <button onClick={goForgot} className="text-orange-600 font-medium">
          Reenviar
        </button>
      </p>
    </AuthShell>
  );
}

function Signup({ goLogin, goLanding, onSuccess }) {
  const [form, setForm] = useState({ oficina: "", nome: "", email: "", senha: "" });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const data = await authApi.signup(form);
      onSuccess(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <AuthShell goLanding={goLanding}>
      <h1 className="font-display text-2xl text-slate-900 mb-1">Criar conta</h1>
      <p className="text-sm text-slate-500 mb-6">7 dias grátis, sem cartão de crédito.</p>
      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2 mb-4">
          <CircleAlert size={16} className="shrink-0" /> {erro}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Nome da oficina</label>
          <input
            required
            value={form.oficina}
            onChange={update("oficina")}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Seu nome</label>
          <input
            required
            value={form.nome}
            onChange={update("nome")}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">E-mail</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Senha</label>
          <input
            type="password"
            required
            value={form.senha}
            onChange={update("senha")}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-md text-sm mt-2 inline-flex items-center justify-center gap-2"
        >
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? "Criando conta..." : "Começar teste grátis"}
        </button>
      </form>
      <p className="text-sm text-slate-500 text-center mt-5">
        Já tem conta?{" "}
        <button onClick={goLogin} className="text-orange-600 font-medium">
          Entrar
        </button>
      </p>
    </AuthShell>
  );
}

/* ---------------------------------------------------------
   App
--------------------------------------------------------- */

export default function OficinaApp() {
  const [view, setView] = useState("checking"); // checking | landing | login | signup | forgot | reset | app | mecanico
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [oficina, setOficina] = useState(null);

  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);

  const [carregandoDados, setCarregandoDados] = useState(false);
  const [erroDados, setErroDados] = useState("");
  const [processandoOrdemMecanico, setProcessandoOrdemMecanico] = useState(null);

  const carregarDadosDaOficina = async () => {
    setCarregandoDados(true);
    setErroDados("");
    try {
      const [clientesData, veiculosData, ordensData, orcamentosData, estoqueData, equipeData, faturamentoData] = await Promise.all([
        clientesApi.listar(),
        veiculosApi.listar(),
        ordensApi.listar(),
        orcamentosApi.listar(),
        estoqueApi.listar(),
        usuariosApi.listar(),
        dashboardApi.faturamentoMensal(),
      ]);
      setClients(clientesData.map(mapCliente));
      setVeiculos(veiculosData.map(mapVeiculo));
      setOrders(ordensData.map(mapOrdem));
      setOrcamentos(orcamentosData.map(mapOrcamento));
      setEstoque(estoqueData.map(mapPeca));
      setEquipe(equipeData.map(mapUsuario));
      setFaturamentoMensal(faturamentoData);
    } catch (err) {
      setErroDados(err.message);
    } finally {
      setCarregandoDados(false);
    }
  };

  // Mecanico (e outros perfis de acesso restrito) so tem acesso as rotas de
  // ordens e estoque no backend — entao carrega so o que ele pode ver.
  const carregarOrdensDoMecanico = async () => {
    setCarregandoDados(true);
    setErroDados("");
    try {
      const [ordensData, estoqueData] = await Promise.all([ordensApi.listar(), estoqueApi.listar()]);
      setOrders(ordensData.map(mapOrdem));
      setEstoque(estoqueData.map(mapPeca));
    } catch (err) {
      setErroDados(err.message);
    } finally {
      setCarregandoDados(false);
    }
  };

  const entrarConformePerfil = (dadosUsuario) => {
    if (dadosUsuario.perfil === "MECANICO") {
      setView("mecanico");
      carregarOrdensDoMecanico();
    } else {
      setView("app");
      carregarDadosDaOficina();
    }
  };

  // Ao abrir o app, tenta restaurar a sessao a partir do token salvo no navegador.
  useEffect(() => {
    setOnSessionExpired(() => {
      setUsuario(null);
      setOficina(null);
      setSuccessMessage("Sua sessão expirou. Faça login novamente.");
      setView("login");
    });

    (async () => {
      if (!getAccessToken()) {
        setView("landing");
        return;
      }
      try {
        const data = await authApi.me();
        setUsuario(data);
        setOficina(data.oficina);
        entrarConformePerfil(data);
      } catch {
        clearTokens();
        setView("landing");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSuccess = (data) => {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUsuario(data.usuario);
    setOficina(data.oficina);
    entrarConformePerfil(data.usuario);
  };

  const handleLogout = () => {
    clearTokens();
    setUsuario(null);
    setOficina(null);
    setOrders([]);
    setClients([]);
    setVeiculos([]);
    setOrcamentos([]);
    setEstoque([]);
    setActive("dashboard");
    setView("landing");
  };

  const mudarStatusMecanico = async (ordem, novoStatusUi) => {
    setProcessandoOrdemMecanico(ordem.apiId);
    try {
      await ordensApi.atualizarStatus(ordem.apiId, STATUS_OS_UI_TO_API[novoStatusUi]);
      await carregarOrdensDoMecanico();
    } finally {
      setProcessandoOrdemMecanico(null);
    }
  };

  // Encontra um cliente existente pelo nome (sem diferenciar maiusculas) ou
  // cria um novo na hora — é isso que permite digitar qualquer nome livre
  // nos formularios de veiculo, OS e orcamento.
  const resolverClienteId = async (nome) => {
    const alvo = nome.trim().toLowerCase();
    const existente = clients.find((c) => c.nome.trim().toLowerCase() === alvo);
    if (existente) return existente.id;
    const novo = await clientesApi.criar({ nome: nome.trim() });
    setClients((prev) => [mapCliente(novo), ...prev]);
    return novo.id;
  };

  // Mesma ideia para veiculo: casa pela placa se já existir, senão cadastra.
  const resolverVeiculoId = async ({ clienteId, placa, veiculoTexto }) => {
    const placaAlvo = (placa || "").trim().toUpperCase();
    if (placaAlvo) {
      const existente = veiculos.find((v) => v.placa.trim().toUpperCase() === placaAlvo);
      if (existente) return existente.id;
    }
    if (placaAlvo.length < 6) {
      throw new Error("Informe uma placa válida (mínimo 6 caracteres) para cadastrar o veículo automaticamente.");
    }
    const [marca, ...resto] = (veiculoTexto || "").trim().split(" ");
    const novo = await veiculosApi.criar({
      clienteId,
      placa: placaAlvo,
      marca: marca || "",
      modelo: resto.join(" ") || veiculoTexto || "",
    });
    const clienteNome = clients.find((c) => c.id === clienteId)?.nome;
    setVeiculos((prev) => [mapVeiculo({ ...novo, cliente: { nome: clienteNome } }), ...prev]);
    return novo.id;
  };

  const titles = {
    dashboard: "Dashboard",
    os: "Ordens de Serviço",
    clientes: "Clientes",
    veiculos: "Veículos",
    orcamentos: "Orçamentos",
    estoque: "Estoque",
    financeiro: "Financeiro",
    "relatorio-anual": "Relatório Anual",
    equipe: "Equipe",
    assinatura: "Assinatura",
  };

  const GlobalFonts = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
      .font-display { font-family: 'Oswald', sans-serif; }
      .font-sans { font-family: 'Inter', sans-serif; }
      .font-plate { font-family: 'IBM Plex Mono', monospace; }
    `}</style>
  );

  if (view === "checking") {
    return (
      <>
        <GlobalFonts />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <Loader2 size={28} className="animate-spin text-orange-600" />
        </div>
      </>
    );
  }

  if (view === "mecanico") {
    return (
      <>
        <GlobalFonts />
        <MinhasOrdens
          orders={orders}
          usuario={usuario}
          onLogout={handleLogout}
          carregando={carregandoDados}
          erro={erroDados}
          onMudarStatus={mudarStatusMecanico}
          processando={processandoOrdemMecanico}
          estoque={estoque}
          onEstoqueCriado={carregarOrdensDoMecanico}
        />
      </>
    );
  }

  if (view === "landing") {
    return (
      <>
        <GlobalFonts />
        <Landing goLogin={() => setView("login")} goSignup={() => setView("signup")} />
      </>
    );
  }

  if (view === "login") {
    return (
      <>
        <GlobalFonts />
        <Login
          goSignup={() => setView("signup")}
          goLanding={() => setView("landing")}
          goForgot={() => {
            setSuccessMessage("");
            setView("forgot");
          }}
          onSuccess={handleAuthSuccess}
          mensagemSucesso={successMessage}
        />
      </>
    );
  }

  if (view === "forgot") {
    return (
      <>
        <GlobalFonts />
        <ForgotPassword
          goLogin={() => setView("login")}
          goLanding={() => setView("landing")}
          onSubmit={(email) => {
            setRecoveryEmail(email);
            setView("reset");
          }}
        />
      </>
    );
  }

  if (view === "reset") {
    return (
      <>
        <GlobalFonts />
        <ResetPassword
          email={recoveryEmail}
          goLogin={() => setView("login")}
          goLanding={() => setView("landing")}
          goForgot={() => setView("forgot")}
          onSuccess={() => {
            setSuccessMessage("Senha redefinida com sucesso. Faça login com sua nova senha.");
            setView("login");
          }}
        />
      </>
    );
  }

  if (view === "signup") {
    return (
      <>
        <GlobalFonts />
        <Signup goLogin={() => setView("login")} goLanding={() => setView("landing")} onSuccess={handleAuthSuccess} />
      </>
    );
  }

  if (erroDados) {
    return (
      <>
        <GlobalFonts />
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4">
          <div className="bg-white border border-red-200 rounded-lg p-6 max-w-sm text-center">
            <CircleAlert size={28} className="text-red-600 mx-auto mb-3" />
            <p className="text-sm text-slate-700 mb-4">{erroDados}</p>
            <button
              onClick={carregarDadosDaOficina}
              className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <GlobalFonts />
      <datalist id="lista-clientes">
        {clients.map((c) => (
          <option key={c.id} value={c.nome} />
        ))}
      </datalist>
      <datalist id="lista-placas">
        {veiculos.map((v) => (
          <option key={v.id} value={v.placa} />
        ))}
      </datalist>
      <datalist id="lista-modelos">
        {veiculos.map((v) => (
          <option key={v.id} value={`${v.marca} ${v.modelo}`} />
        ))}
      </datalist>
      <Sidebar
        active={active}
        setActive={setActive}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onLogout={handleLogout}
        nomeOficina={oficina?.nome}
        perfil={usuario?.perfil}
      />
      <div className="flex-1 min-w-0">
        <Topbar title={titles[active]} setOpen={setSidebarOpen} nomeUsuario={usuario?.nome} />
        {carregandoDados ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-orange-600" />
          </div>
        ) : (
          <>
            {active === "dashboard" && (
              <Dashboard orders={orders} clients={clients} orcamentos={orcamentos} faturamentoMensal={faturamentoMensal} />
            )}
            {active === "os" && (
              <OrdensServico
                orders={orders}
                resolverClienteId={resolverClienteId}
                resolverVeiculoId={resolverVeiculoId}
                onCriada={carregarDadosDaOficina}
                equipe={equipe}
                onIrParaEquipe={() => setActive("equipe")}
              />
            )}
            {active === "clientes" && <Clientes clients={clients} onCriado={carregarDadosDaOficina} />}
            {active === "veiculos" && (
              <Veiculos veiculos={veiculos} resolverClienteId={resolverClienteId} onCriado={carregarDadosDaOficina} />
            )}
            {active === "orcamentos" && (
              <Orcamentos
                orcamentos={orcamentos}
                resolverClienteId={resolverClienteId}
                resolverVeiculoId={resolverVeiculoId}
                onAtualizado={carregarDadosDaOficina}
              />
            )}
            {active === "estoque" && <Estoque estoque={estoque} onCriado={carregarDadosDaOficina} />}
            {active === "financeiro" && <Financeiro />}
            {active === "relatorio-anual" && <RelatorioAnual />}
            {active === "equipe" && <Equipe equipe={equipe} onCriado={carregarDadosDaOficina} />}
            {active === "assinatura" && <Assinatura />}
          </>
        )}
      </div>
    </div>
  );
}
