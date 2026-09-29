// Integracao com WhatsApp via Z-API (https://www.z-api.io) — API nao-oficial
// que conecta escaneando um QR Code, como o WhatsApp Web. Mais simples e
// rapida de configurar que a API oficial da Meta, mas tecnicamente nao e
// endossada pelo WhatsApp — existe um risco pequeno de bloqueio do numero,
// principalmente se enviar muitas mensagens em pouco tempo.
//
// Em desenvolvimento, se as credenciais nao estiverem configuradas, a
// mensagem so e impressa no console — assim da pra testar os gatilhos
// (orcamento criado, veiculo pronto, cobranca) sem numero conectado ainda.

const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN; // token de seguranca da conta (recomendado pela Z-API)

const MODO_SIMULADO = !INSTANCE_ID || !TOKEN;

const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

// Normaliza o numero para o formato que a Z-API espera: só dígitos, com
// codigo do pais (55). Aceita numeros ja formatados com DDD e traços.
function formatarTelefone(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

// Envia uma mensagem de texto simples. Retorna { enviado: boolean, motivo? }
// e NUNCA lanca erro — falha ao enviar WhatsApp nao pode derrubar a
// operacao principal (criar OS, criar orcamento etc), só fica registrada.
async function enviarMensagem({ telefone, mensagem }) {
  const numero = formatarTelefone(telefone);
  if (!numero) {
    return { enviado: false, motivo: "Cliente sem telefone/WhatsApp cadastrado." };
  }

  if (MODO_SIMULADO) {
    console.log(`[whatsapp:simulado] Para ${numero}: ${mensagem}`);
    return { enviado: true, simulado: true };
  }

  try {
    const res = await fetch(`${BASE_URL}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CLIENT_TOKEN && { "Client-Token": CLIENT_TOKEN }),
      },
      body: JSON.stringify({ phone: numero, message: mensagem }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      console.error("[whatsapp] falha ao enviar:", data?.error || res.status);
      return { enviado: false, motivo: data?.error || `Erro ${res.status} na Z-API.` };
    }

    return { enviado: true };
  } catch (err) {
    console.error("[whatsapp] erro de conexao:", err.message);
    return { enviado: false, motivo: "Nao foi possivel conectar a Z-API." };
  }
}

/* ---------------------------------------------------------
   Mensagens prontas para os gatilhos do sistema
--------------------------------------------------------- */

function mensagemOrcamentoCriado({ nomeCliente, numero, veiculo, total }) {
  return (
    `Olá, ${nomeCliente}! Seu orçamento *ORC-${numero}* está pronto.\n` +
    `Veículo: ${veiculo}\n` +
    `Valor total: R$ ${total.toFixed(2).replace(".", ",")}\n\n` +
    `Qualquer dúvida, estamos à disposição.`
  );
}

function mensagemVeiculoPronto({ nomeCliente, numeroOS, veiculo, placa }) {
  return (
    `Olá, ${nomeCliente}! Seu veículo já está pronto para retirada. 🚗✅\n` +
    `OS: ${numeroOS}\n` +
    `Veículo: ${veiculo} (${placa})\n\n` +
    `Aguardamos você na oficina!`
  );
}

function mensagemCobranca({ nomeCliente, descricao, valor, vencimento }) {
  return (
    `Olá, ${nomeCliente}! Passando para lembrar sobre um pagamento em aberto:\n` +
    `${descricao}\n` +
    `Valor: R$ ${valor.toFixed(2).replace(".", ",")}\n` +
    `Vencimento: ${vencimento}\n\n` +
    `Qualquer dúvida, é só chamar por aqui.`
  );
}

module.exports = {
  enviarMensagem,
  mensagemOrcamentoCriado,
  mensagemVeiculoPronto,
  mensagemCobranca,
  MODO_SIMULADO,
};
