import nodemailer from "nodemailer";
import { APP_TIME_ZONE } from "../lib/work-schedule";

function createTransporter() {
    if (!process.env.SMTP_HOST) {
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 30_000,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

const transporter = createTransporter();

const DEFAULT_FROM = '"psy-manager" <noreply@psy-manager.com.br>';

export type EmailOutcome = "sent" | "not_configured";

export interface SessionReminderEmail {
    to: string;
    psychologistName: string;
    startsAt: Date;
    sessionType: string;
    meetingUrl: string | null;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function singleLine(value: string): string {
    return value.replace(/[\r\n]+/g, " ").trim();
}

function formatInZone(date: Date, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: APP_TIME_ZONE, ...options }).format(date);
}

export function buildSessionReminder(reminder: SessionReminderEmail) {
    const psychologist = singleLine(reminder.psychologistName);
    const day = formatInZone(reminder.startsAt, { weekday: "long", day: "numeric", month: "long" });
    const shortDay = formatInZone(reminder.startsAt, { day: "2-digit", month: "2-digit" });
    const time = formatInZone(reminder.startsAt, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const online = reminder.sessionType === "online";
    const modality = online ? "Online" : "Presencial";
    const link = online && reminder.meetingUrl ? reminder.meetingUrl : null;

    const subject = `Lembrete: sessão com ${psychologist} em ${shortDay} às ${time}`;
    const text = [
        "Olá!",
        "",
        `Este é um lembrete da sua sessão com ${psychologist}.`,
        "",
        `Data: ${day}`,
        `Horário: ${time}`,
        `Modalidade: ${modality}`,
        ...(link ? [`Link da teleconsulta: ${link}`] : []),
        "",
        "Se não puder comparecer, avise a sua psicóloga.",
    ].join("\n");
    const linkBlock = link
        ? `
  <p style="margin:24px 0;">
    <a href="${escapeHtml(link)}"
       style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
      Entrar na teleconsulta
    </a>
  </p>`
        : "";
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="margin-bottom:8px;color:#0f172a;">Lembrete de sessão</h2>
  <p style="color:#475569;">Este é um lembrete da sua sessão com <strong>${escapeHtml(psychologist)}</strong>.</p>
  <p style="color:#0f172a;margin:16px 0;line-height:1.6;">
    <strong>Data:</strong> ${escapeHtml(day)}<br />
    <strong>Horário:</strong> ${time}<br />
    <strong>Modalidade:</strong> ${modality}
  </p>${linkBlock}
  <p style="color:#94a3b8;font-size:0.85rem;">Se não puder comparecer, avise a sua psicóloga.</p>
</div>`;

    return { subject, text, html };
}

export const emailService = {
    isConfigured(): boolean {
        return transporter !== null;
    },

    async sendSessionReminder(reminder: SessionReminderEmail): Promise<EmailOutcome> {
        if (!transporter) {
            return "not_configured";
        }
        const { subject, text, html } = buildSessionReminder(reminder);
        await transporter.sendMail({
            from: process.env.SMTP_FROM || DEFAULT_FROM,
            to: reminder.to,
            subject,
            text,
            html,
        });
        return "sent";
    },

    async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
        if (!transporter) {
            console.warn("[email] SMTP não configurado. E-mail de redefinição de senha não enviado.");
            return;
        }
        await transporter.sendMail({
            from: process.env.SMTP_FROM || DEFAULT_FROM,
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
