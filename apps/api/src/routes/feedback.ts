import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { feedbackService } from "../services/feedback.service";

export const feedbackRouter = router({
    submit: protectedProcedure
        .input(
            z.object({
                message: z.string().min(5).max(1000),
                page: z.string().max(255),
                category: z.enum(["confuso", "nao_funciona", "sugestao", "outro"]),
                screenshotBase64: z.string().max(500_000).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            await feedbackService.submit(
                ctx.session.user.id,
                ctx.session.user.name,
                input
            );
        }),
});
