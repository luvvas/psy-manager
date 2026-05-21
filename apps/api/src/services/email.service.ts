import nodemailer from "nodemailer";

function createTransporter() {
    if (!process.env.SMTP_HOST) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

const transporter = createTransporter();

export const emailService = {
    async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
        if (!transporter) {
            console.warn(`[email] SMTP não configurado. Link de redefinição para ${to}: ${resetUrl}`);
            return;
        }
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"psy-manager" <noreply@psy-manager.com.br>',
            to,
            subject: "Redefinição de senha — psy-manager",
            text: `Clique no link abaixo para redefinir sua senha:\n\n${resetUrl}\n\nSe você não solicitou isso, ignore este email. O link expira em 1 hora.`,
            html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="margin-bottom:8px;color:#0f172a;">Redefinição de senha</h2>
  <p style="color:#475569;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>psy-manager</strong>.</p>
  <p style="margin:24px 0;">
    <a href="${resetUrl}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
      Redefinir senha
    </a>
  </p>
  <p style="color:#94a3b8;font-size:0.85rem;">Se você não solicitou a redefinição de senha, ignore este email. Seu acesso permanece protegido.</p>
  <p style="color:#94a3b8;font-size:0.85rem;">O link expira em 1 hora.</p>
</div>`,
        });
    },
};
