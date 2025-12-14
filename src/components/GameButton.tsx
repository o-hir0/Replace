"use client"

import { recordGameResult } from "@/src/server/controllers/postResult"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function GameButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleClick = async () => {
        setLoading(true)
        try {
            // Import stores dynamically to avoid SSR issues
            const {
                mainNodesStore,
                itemNodesStore,
                playerStore,
                battleCountStore,
                cycleCountStore,
                gameStateStore,
                eventsStore,
                currentEventIndexStore,
                gamePlayStatsStore
            } = await import("../store/game");

            const nodes = mainNodesStore.get();
            const items = itemNodesStore.get();
            const stats = playerStore.get();
            const totalBattlesForSave = battleCountStore.get();
            const playLog = gamePlayStatsStore.get();

            // Progress data
            const progress = {
                battleCount: battleCountStore.get(),
                currentEventIndex: currentEventIndexStore.get(),
                gameState: gameStateStore.get(),
                events: eventsStore.get(),
                cycleCount: cycleCountStore.get(),
            };
            const mapCycle = cycleCountStore.get();
            const mapEventIndex = currentEventIndexStore.get();

            // Map current GameState to DB Status
            // If we are clicking this button, it's a Manual Save.
            // So we force "SAVED" usually. 
            // BUT user said "status is simple: SAVED, GAME_OVER, COMPLETED".
            // Since this is "Save & Exit", it acts as a suspend. So "SAVED".
            const status = "SAVED";

            await recordGameResult(totalBattlesForSave, nodes, items, stats, status, progress, {
                totalBattles: totalBattlesForSave,
                playLog,
                mapCycle,
                mapEventIndex,
            });
            router.push("/mypage")
        } catch (error) {
            console.error(error)
            alert("Failed to save result")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
            {loading ? "Saving..." : "Save Game Result"}
        </button>
    )
}
