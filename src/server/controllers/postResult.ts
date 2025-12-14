'use server';

import { auth } from "@/src/auth";
import { db } from "@/src/db";
import { gameResults } from "@/src/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export const recordGameResult = async (
    cycle: number,
    nodes: any[], // NodeItem[]
    items: any[], // NodeItem[]
    stats: any,   // Entity
    status: "SAVED" | "COMPLETED" | "GAME_OVER" = "SAVED",
    progress?: any, // New: { battleCount, currentEventIndex, gameState, events }
    playLog?: any // New: GamePlayStats
) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        throw new Error("Not authenticated");
    }

    // Wrap stats and progress into a single object for statsSnapshot
    const statsSnapshot = {
        player: stats,
        progress: progress || null
    };

    if (status === 'SAVED') {
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
                    cycle,
                    code: nodes,
                    itemsSnapshot: items,
                    statsSnapshot: statsSnapshot,
                    playLog: playLog || null,
                    createdAt: new Date(), // Update timestamp to show it's recent
                })
                .where(eq(gameResults.id, existingSave.id))
                .returning();

            revalidatePath('/mypage');
            return { success: true, result: result[0] };
        }
    }

    // Insert new record (for first save or history)
    const result = await db.insert(gameResults).values({
        userId: userId,
        cycle,
        code: nodes,
        itemsSnapshot: items,
        statsSnapshot: statsSnapshot,
        playLog: playLog || null,
        status: status,
    }).returning();

    revalidatePath('/mypage');
    return { success: true, result: result[0] };
};
