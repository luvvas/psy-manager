import { router, protectedProcedure } from "../trpc/index";
import { featureFlagService } from "../services/feature-flag.service";

export const featureFlagsRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
        return featureFlagService.listForUser(ctx.session.user.id);
    }),
});
