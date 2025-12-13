'use client';

import { useStore } from '@nanostores/react';
import { mainNodesStore, logStore, gameStateStore, selectedShopItemIndexStore, shopFocusAreaStore, playerStore, itemNodesStore } from '../store/game';
import { executeGameLoop } from '../lib/transpiler';
import Stats from './Stats';
import Editor from './Editor';
import Items from './Items';
import Map from './Map';
import Shop from './Shop';
import ItemRewardModal from './ItemRewardModal';
import { GameButton } from './GameButton';
import { useEffect, useState } from 'react';
import { getLatestSave } from '../server/controllers/getResult';

export default function Game() {
    const logs = useStore(logStore);
    const gameState = useStore(gameStateStore);
    const player = useStore(playerStore);
    const [isRunning, setIsRunning] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);

    // Load initial state
    // Load initial state
    useEffect(() => {
        const loadState = async () => {
            const result = await getLatestSave();
            if (result) {
                // Restore state from snapshot
                if (result.statsSnapshot) {
                    const snap: any = result.statsSnapshot;
                    // Check if it's the new structure { player, progress } or legacy Entity
                    if (snap.player) {
                        playerStore.set(snap.player as any);
                    } else {
                        // Legacy: it's just the entity
                        playerStore.set(snap as any);
                    }

                    // Restore progress if available
                    if (snap.progress) {
                        import('../store/game').then(mod => {
                            if (snap.progress.battleCount !== undefined) mod.battleCountStore.set(snap.progress.battleCount);
                            if (snap.progress.currentEventIndex !== undefined) mod.currentEventIndexStore.set(snap.progress.currentEventIndex);
                            if (snap.progress.gameState) mod.gameStateStore.set(snap.progress.gameState);
                            if (snap.progress.events) mod.eventsStore.set(snap.progress.events);
                        });
                    }
                }
                if (result.itemsSnapshot) {
                    itemNodesStore.set(result.itemsSnapshot as any[]);
                }
                if (result.code) {
                    let loadedNodes = result.code;
                    // Handle potential string vs object (though schema is json now)
                    if (typeof loadedNodes === 'string') {
                        try {
                            loadedNodes = JSON.parse(loadedNodes);
                        } catch (e) { }
                    }
                    if (Array.isArray(loadedNodes)) {
                        mainNodesStore.set(loadedNodes);
                    }
                }
                if (result.cycle && (!result.statsSnapshot || !(result.statsSnapshot as any).progress)) {
                    // Fallback using cycle if progress not saved (legacy)
                    import('../store/game').then(mod => {
                        mod.battleCountStore.set(result.cycle - 1); // Cycle was battleCount + 1 approximation
                    });
                }
            }
            // If result is null, we stay with default initial state (New Game)
        };
        loadState();
    }, []);

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
        </div>
    );
}
