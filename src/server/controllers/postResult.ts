'use server';

import { auth } from "@/src/auth";
import { db } from "@/src/db";
import { gameResults } from "@/src/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export const recordGameResult = async (
    totalBattlesInput: number,
    nodes: any[], // NodeItem[]
    items: any[], // NodeItem[]
    stats: any,   // Entity
    status: "SAVED" | "COMPLETED" | "GAME_OVER" = "SAVED",
    progress?: any, // New: { battleCount, currentEventIndex, gameState, events }
    options?: { forceNew?: boolean; playLog?: any; mapCycle?: number; mapEventIndex?: number; totalBattles?: number }
) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        throw new Error("Not authenticated");
    }

    // Wrap stats and progress into a single object for statsSnapshot
    const statsSnapshot = {
        player: stats,
        progress: progress || null,
    };

    const mapCycle = options?.mapCycle ?? 1;
    const mapEventIndex = options?.mapEventIndex ?? 0;
    const totalBattles = options?.totalBattles ?? totalBattlesInput ?? 0;

    if (status === 'SAVED' && !options?.forceNew) {
        const existingSave = await db.query.gameResults.findFirst({
            where: (results, { eq, and }) => and(
                eq(results.userId, userId),
                eq(results.status, 'SAVED')
            ),
            orderBy: (results, { desc }) => [desc(results.createdAt)],
        });

        if (existingSave) {
            // Update existing save
            const result = await db.update(gameResults)
                .set({
                    mapCycle,
                    mapEventIndex,
                    totalBattles,
                    code: nodes,
                    itemsSnapshot: items,
                    statsSnapshot: statsSnapshot,
                    playLog: options?.playLog || null,
                    createdAt: new Date(), // Update timestamp to show it's recent
                })
                .where(eq(gameResults.id, existingSave.id))
                .returning();

            revalidatePath('/mypage');
            return { success: true, result: result[0] };
        }
    }

    // For GAME_OVER / COMPLETED, promote existing SAVED to final state if present
    if (status !== 'SAVED') {
        const existingSave = await db.query.gameResults.findFirst({
            where: (results, { eq, and }) => and(
                eq(results.userId, userId),
                eq(results.status, 'SAVED')
            ),
            orderBy: (results, { desc }) => [desc(results.createdAt)],
        });

        if (existingSave) {
            const result = await db.update(gameResults)
                .set({
                    mapCycle,
                    mapEventIndex,
                    totalBattles,
                    code: nodes,
                    itemsSnapshot: items,
                    statsSnapshot: statsSnapshot,
                    status: status,
                    playLog: options?.playLog || null,
                    createdAt: new Date(),
                })
                .where(eq(gameResults.id, existingSave.id))
                .returning();

            revalidatePath('/mypage');
            return { success: true, result: result[0] };
        }
    }

    // Insert new record (first save or when no convertible SAVED exists)
    const result = await db.insert(gameResults).values({
        userId: userId,
        mapCycle,
        mapEventIndex,
        totalBattles,
        code: nodes,
        itemsSnapshot: items,
        statsSnapshot: statsSnapshot,
        playLog: options?.playLog || null,
        status: status,
    }).returning();

    revalidatePath('/mypage');
    return { success: true, result: result[0] };
};
