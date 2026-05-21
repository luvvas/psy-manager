import { db } from "../db";
import { feedback } from "../db/schema";
import { randomUUID } from "crypto";

const CATEGORY_LABELS: Record<string, string> = {
    confuso: "Está confuso",
    nao_funciona: "Não funciona",
    sugestao: "Sugestão",
    outro: "Outro",
};

const CATEGORY_COLORS: Record<string, number> = {
    confuso: 0xf59e0b,
    nao_funciona: 0xef4444,
    sugestao: 0x6366f1,
    outro: 0x6b7280,
};

async function notifyDiscord(data: {
    message: string;
    page: string;
    category: string;
    userName: string;
    screenshotBase64?: string | null;
}) {
    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                embeds: [
                    {
                        title: `📣 ${CATEGORY_LABELS[data.category] ?? data.category}`,
                        description: data.message,
                        color: CATEGORY_COLORS[data.category] ?? 0x6b7280,
                        fields: [
                            { name: "Tela", value: data.page, inline: true },
                            { name: "Usuário", value: data.userName, inline: true },
                            {
                                name: "Screenshot",
                                value: data.screenshotBase64 ? "✅ Anexado (ver DB)" : "—",
                                inline: true,
                            },
                        ],
                        timestamp: new Date().toISOString(),
                    },
                ],
            }),
        });
    } catch {
        // Notificação falhou — não bloqueia o salvamento
    }
}

export const feedbackService = {
    async submit(
        psychologistId: string,
        userName: string,
        data: { message: string; page: string; category: string; screenshotBase64?: string }
    ) {
        await db.insert(feedback).values({
            id: randomUUID(),
            psychologistId,
            message: data.message,
            page: data.page,
            category: data.category,
            screenshotBase64: data.screenshotBase64 ?? null,
        });

        await notifyDiscord({ ...data, userName });
    },
};
