const { Resend } = require("resend");

const FROM = process.env.EMAIL_FROM || "AUTOMEVO <onboarding@resend.dev>";

async function enviarCodigoRecuperacao({ para, nome, codigo }) {
  // Desenvolvimento sem chave do Resend
  if (!process.env.RESEND_API_KEY) {
    console.log(
      `[email] RESEND_API_KEY nao configurada. Codigo de recuperacao para ${para}: ${codigo}`
    );

    return { simulado: true };
  }

  // Só cria o cliente quando realmente existe uma chave
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const resultado = await resend.emails.send({
      from: FROM,
      to: para,
      subject: "Seu codigo para redefinir a senha - AUTOMEVO",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Redefinir senha</h2>

          <p>Ola, ${nome || ""}.</p>

          <p>
            Use o codigo abaixo para redefinir sua senha na AUTOMEVO.
            Ele expira em 15 minutos.
          </p>

          <div style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 6px;
            background: #f1f5f9;
            padding: 16px 24px;
            border-radius: 8px;
            text-align: center;
            margin: 24px 0;
          ">
            ${codigo}
          </div>

          <p style="color: #64748b; font-size: 13px;">
            Se voce nao pediu essa alteracao, pode ignorar este e-mail com seguranca.
          </p>
        </div>
      `,
    });

    return resultado;
  } catch (error) {
    console.error("[email] Erro ao enviar e-mail:", error);
    throw error;
  }
}

module.exports = { enviarCodigoRecuperacao };