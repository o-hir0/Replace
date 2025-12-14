'use server';

import { auth } from "@/src/auth";
import { db } from "@/src/db";
import { gameResults } from "@/src/db/schema";

export const getLatestSave = async () => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return null;

    return db.query.gameResults.findFirst({
        where: (results, { eq }) => eq(results.userId, userId),
        orderBy: (results, { desc }) => [desc(results.createdAt)],
    });
};
