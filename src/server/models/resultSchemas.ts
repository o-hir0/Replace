import z from "zod";

export const resultSchema = z.object({
    cycle: z.number(),
    code: z.any(), // JSON
    itemsSnapshot: z.any().optional(), // JSON
    statsSnapshot: z.any().optional(), // JSON
    playLog: z.any().optional(), // JSON: GamePlayStats
    status: z.enum(['SAVED', 'COMPLETED', 'GAME_OVER']).optional().default('SAVED'),
});

export type GameResult = z.infer<typeof resultSchema>;
