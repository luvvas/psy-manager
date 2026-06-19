import {
    SchedulerClient,
    CreateScheduleCommand,
    DeleteScheduleCommand,
    FlexibleTimeWindowMode,
    ResourceNotFoundException,
} from "@aws-sdk/client-scheduler";

const client = new SchedulerClient({ region: process.env.AWS_REGION || "sa-east-1" });
const SCHEDULE_GROUP = "psy-manager-reminders";

function buildScheduleExpression(scheduleTime: Date): string {
    // EventBridge Scheduler one-time format: at(yyyy-MM-ddTHH:mm:ss) — always UTC
    const iso = scheduleTime.toISOString().slice(0, 19); // "2026-06-19T11:00:00"
    return `at(${iso})`;
}

// Combines a date (from DB, midnight UTC) with a "HH:MM" startTime string.
// startTime is treated as America/Sao_Paulo (UTC-3) since this is a Brazilian-only SaaS.
function buildAppointmentDateTime(date: Date, startTime: string): Date {
    const BRAZIL_UTC_OFFSET_HOURS = 3; // UTC-3
    const [h, m] = startTime.split(":").map(Number);
    return new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            h + BRAZIL_UTC_OFFSET_HOURS,
            m,
            0,
            0,
        ),
    );
}

export interface CreateReminderParams {
    appointmentId: string;
    patientPhone: string;
    patientName: string;
    psychologistName: string;
    appointmentDate: Date;
    appointmentStartTime: string;
    appointmentDateFormatted: string;
    reminderMinutesBefore: number;
}

export const reminderSchedulerService = {
    async createSchedule(params: CreateReminderParams): Promise<void> {
        const lambdaArn = process.env.AWS_REMINDER_LAMBDA_ARN;
        const roleArn = process.env.AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN;

        if (!lambdaArn || !roleArn) {
            console.warn("[reminder-scheduler] AWS_REMINDER_LAMBDA_ARN or AWS_EVENTBRIDGE_SCHEDULER_ROLE_ARN not set. Skipping schedule creation.");
            return;
        }

        const appointmentDateTime = buildAppointmentDateTime(params.appointmentDate, params.appointmentStartTime);
        const scheduleTime = new Date(appointmentDateTime.getTime() - params.reminderMinutesBefore * 60 * 1000);

        if (scheduleTime <= new Date()) {
            console.warn(`[reminder-scheduler] Schedule time is in the past for appointment ${params.appointmentId}. Skipping.`);
            return;
        }

        const callbackUrl = process.env.API_INTERNAL_URL
            ? `${process.env.API_INTERNAL_URL}/api/internal/reminder-callback`
            : "";

        await client.send(
            new CreateScheduleCommand({
                Name: `reminder-${params.appointmentId}`,
                GroupName: SCHEDULE_GROUP,
                ScheduleExpression: buildScheduleExpression(scheduleTime),
                ScheduleExpressionTimezone: "UTC",
                FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
                ActionAfterCompletion: "DELETE",
                Target: {
                    Arn: lambdaArn,
                    RoleArn: roleArn,
                    Input: JSON.stringify({
                        appointmentId: params.appointmentId,
                        patientPhone: params.patientPhone,
                        patientName: params.patientName,
                        psychologistName: params.psychologistName,
                        appointmentDate: params.appointmentDateFormatted,
                        appointmentTime: params.appointmentStartTime,
                        callbackUrl,
                        callbackSecret: process.env.LAMBDA_CALLBACK_SECRET || "",
                    }),
                },
            }),
        );

        console.log(`[reminder-scheduler] Schedule created for appointment ${params.appointmentId} at ${scheduleTime.toISOString()}`);
    },

    async deleteSchedule(appointmentId: string): Promise<void> {
        const lambdaArn = process.env.AWS_REMINDER_LAMBDA_ARN;
        if (!lambdaArn) return;

        try {
            await client.send(
                new DeleteScheduleCommand({
                    Name: `reminder-${appointmentId}`,
                    GroupName: SCHEDULE_GROUP,
                }),
            );
            console.log(`[reminder-scheduler] Schedule deleted for appointment ${appointmentId}`);
        } catch (err) {
            if (err instanceof ResourceNotFoundException) return;
            throw err;
        }
    },
};
