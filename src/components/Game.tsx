'use client';

import { useStore } from '@nanostores/react';
import { mainNodesStore, logStore, gameStateStore, selectedShopItemIndexStore, shopFocusAreaStore, playerStore, itemNodesStore, gameResultStore, resetGameState, cycleCountStore, battleCountStore, currentEventIndexStore, gamePlayStatsStore, type Entity, type NodeItem, type GameState, type EventType } from '../store/game';
import { executeGameLoop } from '../lib/transpiler';
import Stats from './Stats';
import Editor from './Editor';
import Items from './Items';
import Map from './Map';
import Shop from './Shop';
import ItemRewardModal from './ItemRewardModal';
import GameResultModal from './GameResultModal';
import { GameButton } from './GameButton';
import { useEffect, useRef, useState } from 'react';
import { getLatestSave } from '../server/controllers/getResult';
import { useSearchParams } from 'next/navigation';

type ProgressSnapshot = {
    battleCount?: number;
    currentEventIndex?: number;
    gameState?: GameState;
    events?: EventType[];
    cycleCount?: number;
};

type StructuredStatsSnapshot = {
    player: Entity;
    progress?: ProgressSnapshot;
};

type LegacyStatsSnapshot = Entity & { progress?: ProgressSnapshot };

const isProgressSnapshot = (value: unknown): value is ProgressSnapshot => {
    if (!value || typeof value !== 'object') return false;
    const progress = value as ProgressSnapshot;
    const hasNumbers =
        (progress.battleCount === undefined || typeof progress.battleCount === 'number') &&
        (progress.currentEventIndex === undefined || typeof progress.currentEventIndex === 'number') &&
        (progress.cycleCount === undefined || typeof progress.cycleCount === 'number');
    const hasGameState = progress.gameState === undefined || typeof progress.gameState === 'string';
    const hasEvents =
        progress.events === undefined ||
        (Array.isArray(progress.events) && progress.events.every((evt) => typeof evt === 'string'));
    return hasNumbers && hasGameState && hasEvents;
};

const hasEntityFields = (value: unknown): value is Entity => {
    if (!value || typeof value !== 'object') return false;
    const v = value as Entity;
    return (
        typeof v.hp === 'number' &&
        typeof v.atk === 'number' &&
        typeof v.bp === 'number'
    );
};

const isStructuredStatsSnapshot = (value: unknown): value is StructuredStatsSnapshot => {
    if (!value || typeof value !== 'object') return false;
    const snap = value as StructuredStatsSnapshot;
    return hasEntityFields(snap.player) && (snap.progress === undefined || isProgressSnapshot(snap.progress));
};

const isLegacyStatsSnapshot = (value: unknown): value is LegacyStatsSnapshot => {
    if (!hasEntityFields(value)) return false;
    const snap = value as LegacyStatsSnapshot;
    return snap.progress === undefined || isProgressSnapshot(snap.progress);
};

const isNodeArray = (value: unknown): value is NodeItem[] =>
    Array.isArray(value) &&
    value.every(
        (node) =>
            node &&
            typeof node === 'object' &&
            'id' in node &&
            'label' in node &&
            'type' in node
    );

export default function Game() {
    const logs = useStore(logStore);
    const gameState = useStore(gameStateStore);
    const player = useStore(playerStore);
    const gameResult = useStore(gameResultStore);
    const [isRunning, setIsRunning] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const searchParams = useSearchParams();
    const hasInitialized = useRef(false);

    // Load initial state
    // Load initial state
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const loadState = async () => {
            try {
                // 新規ゲームの場合はリセット
                const isNewGame = searchParams.get('newGame') === 'true';
                if (isNewGame) {
                    gameResultStore.set(null);
                    resetGameState();
                    return;
                }

                const result = await getLatestSave();
                if (result && result.status === 'SAVED') {
                    gameResultStore.set(null);
                    // Restore state from snapshot
                    if (result.statsSnapshot) {
                        const snap = result.statsSnapshot as any;
                        // Check if it's the new structure { player, progress } or legacy Entity
                        if (isStructuredStatsSnapshot(snap)) {
                            playerStore.set(snap.player);
                            const progress = snap.progress;
                            if (progress) {
                                import('../store/game').then(mod => {
                                    if (progress.battleCount !== undefined) mod.battleCountStore.set(progress.battleCount);
                                    if (progress.currentEventIndex !== undefined) mod.currentEventIndexStore.set(progress.currentEventIndex);
                                    if (progress.cycleCount !== undefined) mod.cycleCountStore.set(progress.cycleCount);
                                    if (progress.gameState) mod.gameStateStore.set(progress.gameState);
                                    if (progress.events) mod.eventsStore.set(progress.events);
                                });
                            }
                        } else if (isLegacyStatsSnapshot(snap)) {
                            // Legacy: it's just the entity
                            playerStore.set(snap);
                            if (snap.progress) {
                                const progress = snap.progress;
                                import('../store/game').then(mod => {
                                    if (progress.battleCount !== undefined) mod.battleCountStore.set(progress.battleCount);
                                    if (progress.currentEventIndex !== undefined) mod.currentEventIndexStore.set(progress.currentEventIndex);
                                    if (progress.cycleCount !== undefined) mod.cycleCountStore.set(progress.cycleCount);
                                    if (progress.gameState) mod.gameStateStore.set(progress.gameState);
                                    if (progress.events) mod.eventsStore.set(progress.events);
                                });
                            }
                        }

                    }
                    // Restore Play Log Stats from dedicated column if available
                    if (result.playLog) {
                        import('../store/game').then(mod => {
                            mod.gamePlayStatsStore.set(result.playLog as any);
                        });
                    }
                    if (isNodeArray(result.itemsSnapshot)) {
                        itemNodesStore.set(result.itemsSnapshot);
                    }
                    if (result.code) {
                        let loadedNodes: unknown = result.code;
                        // Handle potential string vs object (though schema is json now)
                        if (typeof loadedNodes === 'string') {
                            try {
                                loadedNodes = JSON.parse(loadedNodes);
                            } catch (e) {
                                loadedNodes = null;
                            }
                        }
                        if (isNodeArray(loadedNodes)) {
                            mainNodesStore.set(loadedNodes);
                        }
                    }
                    const hasProgress =
                        (result.statsSnapshot && isStructuredStatsSnapshot(result.statsSnapshot) && !!(result.statsSnapshot as any).progress) ||
                        (result.statsSnapshot && isLegacyStatsSnapshot(result.statsSnapshot) && !!(result.statsSnapshot as any).progress);
                    if (!hasProgress) {
                        import('../store/game').then(mod => {
                            if (typeof result.mapCycle === 'number') mod.cycleCountStore.set(result.mapCycle);
                            if (typeof result.mapEventIndex === 'number') mod.currentEventIndexStore.set(result.mapEventIndex);
                            if (typeof result.totalBattles === 'number') mod.battleCountStore.set(result.totalBattles);
                        });
                    }
                } else {
                    // ゲームオーバー/クリア済み、またはセーブなし -> 新規開始
                    gameResultStore.set(null);
                    resetGameState();
                }
            } catch (error) {
                console.error('Failed to load saved data, starting new run', error);
                gameResultStore.set(null);
                resetGameState();
            }
        };
        loadState();
    }, [searchParams]);

    // Sync state removed - we only save on explicit button click

    useEffect(() => {
        if (gameState !== 'SHOP') {
            selectedShopItemIndexStore.set(null);
            shopFocusAreaStore.set(null);
        } else {
            shopFocusAreaStore.set(null);
        }
    }, [gameState]);

    const handleRun = async () => {
        if (isRunning) return;
        setIsRunning(true);
        const nodes = mainNodesStore.get();
        await executeGameLoop(nodes);
        setIsRunning(false);

        // イベント進行はItemRewardModalの「次に進む」ボタンで処理されるため、
        // ここでは何もしない（敵を倒したときはモーダルが表示される）
    };

    return (
        <div className="flex h-screen w-full bg-gray-900 text-white font-sans overflow-hidden relative">
            {/* Map Modal */}
            {showMapModal && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setShowMapModal(false)}>
                    <div className="w-3/4 h-3/4 bg-gray-800 rounded-xl border-4 border-gray-600 p-4 relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowMapModal(false)}
                            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-400"
                        >
                            ✕
                        </button>
                        <Map isModal={true} />
                    </div>
                </div>
            )}

            {/* Main Content */}
            {gameState === 'MAP' ? (
                <div className="w-full h-full relative">
                    <Map />
                    <div className="absolute bottom-4 right-4 z-40">
                    </div>
                </div>
            ) : (
                <>
                    {/* Left Column: Stats & Visuals OR Shop */}
                    <div className="w-1/2 flex flex-col border-r border-gray-700 relative">
                        {/* Map Button */}
                        <button
                            onClick={() => setShowMapModal(true)}
                            className="absolute top-4 left-4 z-40 w-16 h-16 bg-gray-700 rounded-full border-2 border-gray-500 flex items-center justify-center hover:bg-gray-600 transition-colors"
                            title="Show Map"
                        >
                            <img src="/asset/ui/map.svg" alt="map" className="w-8 h-8" />
                        </button>

                        {gameState === 'SHOP' && <Shop />}
                        {(gameState === 'BATTLE' || gameState === 'BOSS') && (
                            <>
                                <div className="grow relative h-2/3">
                                    <Stats />
                                </div>

                                <div className="p-4 bg-[#A86637] h-1/3 flex flex-col space-y-4">
                                    {/* Logs Overlay */}
                                    <div className="flex-1 overflow-y-auto min-h-0 bg-black/50 p-2 text-xs font-mono rounded">
                                        {logs.map((log, i) => (
                                            <div key={i}>{log}</div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRun}
                                            disabled={isRunning}
                                            className={`flex-1 py-4 h-20 text-3xl font-bold rounded shadow-lg transition-all shrink-0 ${isRunning ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#538E3A] hover:bg-green-500 active:scale-95'
                                                }`}
                                        >
                                            {isRunning ? 'RUNNING...' : 'RUN'}
                                        </button>
                                        <div className="flex flex-col justify-end">
                                            <GameButton />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Middle Column: Editor */}
                    <div className="w-[35%] border-r border-gray-700">
                        <Editor />
                    </div>

                    {/* Right Column: Items */}
                    <div className="w-[15%]">
                        <Items />
                    </div>
                </>
            )}

            {/* Item Reward Modal */}
            <ItemRewardModal />

            {/* Game Result Modal */}
            {gameResult && (
                <GameResultModal
                    result={gameResult}
                    onClose={() => gameResultStore.set(null)}
                />
            )}
        </div>
    );
}
