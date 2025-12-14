import z from "zod";

export const resultSchema = z.object({
    code: z.any(), // JSON
    itemsSnapshot: z.any().optional(), // JSON
    statsSnapshot: z.any().optional(), // JSON
    playLog: z.any().optional(), // JSON: GamePlayStats
    progress: z.any().optional(),
    mapCycle: z.number().optional(),
    mapEventIndex: z.number().optional(),
    totalBattles: z.number().optional(),
    status: z.enum(['SAVED', 'COMPLETED', 'GAME_OVER']).optional().default('SAVED'),
});

export type GameResult = z.infer<typeof resultSchema>;
