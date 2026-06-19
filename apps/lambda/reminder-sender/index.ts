// Lambda handler — invoked by EventBridge Scheduler to send WhatsApp appointment reminders.
// Runtime: Node.js 20.x
// Deploy: bundle with esbuild (see package.json build script) then upload dist/index.mjs to Lambda.

interface ReminderPayload {
    appointmentId: string;
    patientPhone: string;       // international format: +5511999999999
    patientName: string;
    psychologistName: string;
    appointmentDate: string;    // formatted: "19/06/2026"
    appointmentTime: string;    // formatted: "14:00"
    callbackUrl: string;        // API internal callback URL
    callbackSecret: string;     // shared secret for X-Callback-Secret header
}

async function sendWhatsAppTemplate(payload: ReminderPayload): Promise<void> {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const accessToken = process.env.META_API_TOKEN;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "appointment_reminder";

    if (!phoneNumberId || !accessToken) {
        throw new Error("META_PHONE_NUMBER_ID or META_API_TOKEN not configured");
    }

    const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: payload.patientPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "pt_BR" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: payload.patientName },
                                { type: "text", text: payload.psychologistName },
                                { type: "text", text: payload.appointmentDate },
                                { type: "text", text: payload.appointmentTime },
                            ],
                        },
                    ],
                },
            }),
        },
    );

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Meta API error ${res.status}: ${body}`);
    }
}

async function notifyApiCallback(payload: ReminderPayload): Promise<void> {
    if (!payload.callbackUrl || !payload.callbackSecret) {
        console.warn("[reminder] callbackUrl or callbackSecret not set — skipping reminderSentAt update");
        return;
    }

    const res = await fetch(payload.callbackUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-callback-secret": payload.callbackSecret,
        },
        body: JSON.stringify({ appointmentId: payload.appointmentId }),
    });

    if (!res.ok) {
        console.error(`[reminder] Callback to API failed: ${res.status}`);
    }
}

export const handler = async (event: ReminderPayload): Promise<void> => {
    console.log(`[reminder] Sending reminder for appointment ${event.appointmentId} to ${event.patientPhone}`);

    await sendWhatsAppTemplate(event);
    console.log(`[reminder] WhatsApp message sent for appointment ${event.appointmentId}`);

    await notifyApiCallback(event);
    console.log(`[reminder] Callback done for appointment ${event.appointmentId}`);
};
