const prisma = require("../lib/prisma");

// POST /api/webhooks/asaas
// O Asaas chama essa rota sozinho quando o status de uma cobranca muda
// (pago, atrasado, estornado, assinatura cancelada por inadimplencia etc).
// Isso mantem o status da assinatura sincronizado sem ninguem precisar
// checar manualmente.
async function asaasWebhook(req, res, next) {
  try {
    // Se um token de webhook foi configurado, exige que o Asaas o envie de
    // volta no header — evita que qualquer pessoa chame essa rota fingindo
    // ser o Asaas.
    const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
    if (tokenEsperado) {
      const tokenRecebido = req.headers["asaas-access-token"];
      if (tokenRecebido !== tokenEsperado) {
        return res.status(401).json({ erro: "Token de webhook invalido." });
      }
    }

    const { event, payment } = req.body || {};
    if (!event || !payment?.subscription) {
      return res.status(200).json({ recebido: true }); // evento que nao interessa, so confirma recebimento
    }

    const assinatura = await prisma.assinatura.findFirst({ where: { externalId: payment.subscription } });
    if (!assinatura) {
      return res.status(200).json({ recebido: true }); // assinatura de outra oficina/ambiente
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await prisma.$transaction([
        prisma.assinatura.update({ where: { id: assinatura.id }, data: { status: "ATIVA" } }),
        prisma.oficina.update({ where: { id: assinatura.oficinaId }, data: { status: "ATIVA" } }),
      ]);
    } else if (event === "PAYMENT_OVERDUE") {
      await prisma.assinatura.update({ where: { id: assinatura.id }, data: { status: "INADIMPLENTE" } });
      // A oficina continua acessando o sistema normalmente durante o atraso;
      // o bloqueio (se a oficina quiser adotar essa politica) e feito
      // manualmente pelo Painel Master, nao automaticamente aqui.
    } else if (event === "SUBSCRIPTION_DELETED" || event === "PAYMENT_DELETED") {
      await prisma.$transaction([
        prisma.assinatura.update({ where: { id: assinatura.id }, data: { status: "CANCELADA" } }),
        prisma.oficina.update({ where: { id: assinatura.oficinaId }, data: { status: "CANCELADA" } }),
      ]);
    }

    return res.status(200).json({ recebido: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { asaasWebhook };
