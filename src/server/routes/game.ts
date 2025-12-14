import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { recordGameResult } from "../controllers/postResult";
import { resultSchema } from "../models/resultSchemas";

export const gameRoutes = new Hono()
    .post("/result", zValidator("json", resultSchema), async (c) => {
        const { code, itemsSnapshot, statsSnapshot, status, playLog, progress, mapCycle, mapEventIndex, totalBattles } = c.req.valid("json");
        try {
            const result = await recordGameResult(totalBattles ?? 0, code, itemsSnapshot ?? [], statsSnapshot ?? {}, status, progress, {
                playLog,
                mapCycle,
                mapEventIndex,
                totalBattles,
            });
            return c.json(result);
        } catch (e: any) {
            return c.json({ error: e.message }, 401);
        }
    });
