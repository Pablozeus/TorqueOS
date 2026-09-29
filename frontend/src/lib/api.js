// Cliente HTTP central para falar com o backend do TorqueOS.
// Guarda o access token / refresh token no localStorage (projeto roda no
// navegador do próprio usuário, então isso é seguro e é o padrão do mercado
// para SPAs como essa).

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3333/api";

const ACCESS_KEY = "torqueos_access_token";
const REFRESH_KEY = "torqueos_refresh_token";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Chamado pelo App quando a sessão expira de vez (refresh token também
// inválido) — o App usa isso para jogar o usuário de volta pro login.
let onSessionExpired = () => {};
export function setOnSessionExpired(fn) {
  onSessionExpired = fn;
}

async function tentarRenovarToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens({ accessToken: data.accessToken });
    return true;
  } catch {
    return false;
  }
}

// options.auth = false para rotas publicas (login, signup, forgot/reset password)
export async function apiFetch(path, { method = "GET", body, auth = true, _retry = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error("Não foi possível conectar à API. Verifique se o backend está rodando.");
  }

  // Access token expirado — tenta renovar uma vez e repetir a chamada original.
  if (res.status === 401 && auth && !_retry) {
    const renovou = await tentarRenovarToken();
    if (renovou) {
      return apiFetch(path, { method, body, auth, _retry: true });
    }
    clearTokens();
    onSessionExpired();
    throw new Error("Sua sessão expirou. Faça login novamente.");
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem corpo
  }

  if (!res.ok) {
    const mensagem = data?.erro || `Erro ${res.status} ao falar com o servidor.`;
    throw new Error(mensagem);
  }

  return data;
}

/* ---------------------------------------------------------
   Autenticação
--------------------------------------------------------- */

export const authApi = {
  signup: (data) => apiFetch("/auth/signup", { method: "POST", body: data, auth: false }),
  login: (data) => apiFetch("/auth/login", { method: "POST", body: data, auth: false }),
  me: () => apiFetch("/auth/me"),
  forgotPassword: (email) => apiFetch("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (data) => apiFetch("/auth/reset-password", { method: "POST", body: data, auth: false }),
};

/* ---------------------------------------------------------
   Clientes
--------------------------------------------------------- */

export const clientesApi = {
  listar: (busca) => apiFetch(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  criar: (data) => apiFetch("/clientes", { method: "POST", body: data }),
  atualizar: (id, data) => apiFetch(`/clientes/${id}`, { method: "PUT", body: data }),
  remover: (id) => apiFetch(`/clientes/${id}`, { method: "DELETE" }),
};

/* ---------------------------------------------------------
   Veículos
--------------------------------------------------------- */

export const veiculosApi = {
  listar: (busca) => apiFetch(`/veiculos${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  criar: (data) => apiFetch("/veiculos", { method: "POST", body: data }),
  atualizar: (id, data) => apiFetch(`/veiculos/${id}`, { method: "PUT", body: data }),
  remover: (id) => apiFetch(`/veiculos/${id}`, { method: "DELETE" }),
};

/* ---------------------------------------------------------
   Ordens de Serviço
--------------------------------------------------------- */

export const ordensApi = {
  listar: () => apiFetch("/ordens"),
  criar: (data) => apiFetch("/ordens", { method: "POST", body: data }),
  atualizarStatus: (id, status) => apiFetch(`/ordens/${id}/status`, { method: "PATCH", body: { status } }),
  remover: (id) => apiFetch(`/ordens/${id}`, { method: "DELETE" }),
};

/* ---------------------------------------------------------
   Orçamentos
--------------------------------------------------------- */

export const orcamentosApi = {
  listar: () => apiFetch("/orcamentos"),
  criar: (data) => apiFetch("/orcamentos", { method: "POST", body: data }),
  atualizar: (id, data) => apiFetch(`/orcamentos/${id}`, { method: "PUT", body: data }),
  atualizarStatus: (id, status) => apiFetch(`/orcamentos/${id}/status`, { method: "PATCH", body: { status } }),
  converter: (id) => apiFetch(`/orcamentos/${id}/converter`, { method: "POST" }),
  remover: (id) => apiFetch(`/orcamentos/${id}`, { method: "DELETE" }),
};

/* ---------------------------------------------------------
   Estoque
--------------------------------------------------------- */

export const estoqueApi = {
  listar: () => apiFetch("/estoque"),
  criar: (data) => apiFetch("/estoque", { method: "POST", body: data }),
  atualizar: (id, data) => apiFetch(`/estoque/${id}`, { method: "PUT", body: data }),
  movimentar: (id, data) => apiFetch(`/estoque/${id}/movimentacao`, { method: "POST", body: data }),
  remover: (id) => apiFetch(`/estoque/${id}`, { method: "DELETE" }),
};

/* ---------------------------------------------------------
   Financeiro
--------------------------------------------------------- */

export const financeiroApi = {
  listarReceber: () => apiFetch("/financeiro/receber"),
  criarReceber: (data) => apiFetch("/financeiro/receber", { method: "POST", body: data }),
  pagarReceber: (id) => apiFetch(`/financeiro/receber/${id}/pagar`, { method: "PATCH" }),
  cobrarReceber: (id) => apiFetch(`/financeiro/receber/${id}/cobrar`, { method: "POST" }),
  listarPagar: () => apiFetch("/financeiro/pagar"),
  criarPagar: (data) => apiFetch("/financeiro/pagar", { method: "POST", body: data }),
  pagarPagar: (id) => apiFetch(`/financeiro/pagar/${id}/pagar`, { method: "PATCH" }),
  indicadores: () => apiFetch("/financeiro/indicadores"),
  relatorioAnual: (ano) => apiFetch(`/financeiro/relatorio-anual${ano ? `?ano=${ano}` : ""}`),
};

export const assinaturaApi = {
  obter: () => apiFetch("/assinatura"),
  assinar: (data) => apiFetch("/assinatura/assinar", { method: "POST", body: data }),
  cancelar: () => apiFetch("/assinatura/cancelar", { method: "POST" }),
};

/* ---------------------------------------------------------
   Equipe
--------------------------------------------------------- */

export const usuariosApi = {
  listar: () => apiFetch("/usuarios"),
  criar: (data) => apiFetch("/usuarios", { method: "POST", body: data }),
  atualizar: (id, data) => apiFetch(`/usuarios/${id}`, { method: "PATCH", body: data }),
};

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */

export const dashboardApi = {
  resumo: () => apiFetch("/dashboard"),
  faturamentoMensal: () => apiFetch("/dashboard/faturamento-mensal"),
};
