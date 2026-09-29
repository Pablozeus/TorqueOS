// Integracao com o Asaas (https://www.asaas.com) — cobranca recorrente por
// boleto, com envio automatico por e-mail e cancelamento pela API deles.
//
// Em desenvolvimento, se ASAAS_API_KEY nao estiver configurada, as funcoes
// abaixo NAO fazem nenhuma chamada real e retornam um resultado simulado —
// assim da pra testar o fluxo de assinatura/cancelamento sem gerar cobranca
// de verdade. Isso e so para o ambiente local: em producao, configure a
// chave real antes de aceitar assinaturas.

const BASE_URL =
  process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";

const API_KEY = process.env.ASAAS_API_KEY;
const MODO_SIMULADO = !API_KEY;

async function chamarAsaas(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const mensagem = data?.errors?.[0]?.description || `Erro ${res.status} ao falar com o Asaas.`;
    throw new Error(mensagem);
  }

  return data;
}

// Cria (ou reaproveita) o cliente no Asaas para essa oficina.
async function criarOuBuscarCliente({ nome, email, cpfCnpj, telefone }) {
  if (MODO_SIMULADO) {
    console.log(`[asaas:simulado] criarCliente para ${email}`);
    return { id: `cus_simulado_${Date.now()}` };
  }

  return chamarAsaas("/customers", {
    method: "POST",
    body: { name: nome, email, cpfCnpj, phone: telefone },
  });
}

// Cria uma assinatura recorrente mensal cobrada por boleto. O Asaas gera a
// primeira cobranca e, a partir dela, envia o boleto por e-mail automatica-
// mente todo mes, no dia de vencimento definido.
async function criarAssinaturaBoleto({ customerId, valor, descricao, diaVencimento }) {
  if (MODO_SIMULADO) {
    console.log(`[asaas:simulado] criarAssinatura de R$ ${valor} para o cliente ${customerId}`);
    return {
      id: `sub_simulado_${Date.now()}`,
      status: "ACTIVE",
      nextDueDate: new Date(Date.now() + diaVencimento * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      invoiceUrl: null,
    };
  }

  const hoje = new Date();
  const proximoVencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento || hoje.getDate());
  if (proximoVencimento < hoje) proximoVencimento.setMonth(proximoVencimento.getMonth() + 1);

  return chamarAsaas("/subscriptions", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "BOLETO",
      cycle: "MONTHLY",
      value: valor,
      description: descricao,
      nextDueDate: proximoVencimento.toISOString().slice(0, 10),
    },
  });
}

// Cancela a assinatura no Asaas (nao gera mais cobrancas futuras).
async function cancelarAssinatura(subscriptionId) {
  if (MODO_SIMULADO) {
    console.log(`[asaas:simulado] cancelarAssinatura ${subscriptionId}`);
    return { deleted: true };
  }
  return chamarAsaas(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

// Busca a cobranca mais recente de uma assinatura, para mostrar o link do
// boleto atual na tela (alem do e-mail que o Asaas ja envia sozinho).
async function buscarCobrancaMaisRecente(subscriptionId) {
  if (MODO_SIMULADO) {
    return { data: [] };
  }
  return chamarAsaas(`/payments?subscription=${subscriptionId}&limit=1&order=desc`);
}

module.exports = { criarOuBuscarCliente, criarAssinaturaBoleto, cancelarAssinatura, buscarCobrancaMaisRecente, MODO_SIMULADO };
