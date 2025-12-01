'use client';

import { useStore } from '@nanostores/react';
import { mainNodesStore, logStore, gameStateStore, selectedShopItemIndexStore, shopFocusAreaStore } from '../store/game';
import { executeGameLoop } from '../lib/transpiler';
import Stats from './Stats';
import Editor from './Editor';
import Items from './Items';
import Map from './Map';
import Shop from './Shop';
import { useEffect, useState } from 'react';

export default function Game() {
  const logs = useStore(logStore);
  const gameState = useStore(gameStateStore);
  const [isRunning, setIsRunning] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

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
    
    // Check if enemy defeated
    import('../store/game').then(mod => {
        const enemy = mod.enemyStore.get();
        if (enemy.hp <= 0) {
            // Advance event
             const result = mod.advanceToNextEvent();
             if (!result.event) return;
             if (result.wrapped || result.event === 'select') {
                 // Enter boss battle on wrap
                 mod.gameStateStore.set('BOSS');
                 mod.currentEventIndexStore.set(-1); // no outer node focus in boss
                 mod.startBossEncounter();
             } else if (result.event === 'battle') {
                 mod.gameStateStore.set('BATTLE');
                 mod.startBattleEncounter();
             } else if (result.event === 'shop') {
                 mod.gameStateStore.set('SHOP');
             }
        }
    });
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
          <div className="w-full h-full">
              <Map />
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
                        <button 
                            onClick={handleRun}
                            disabled={isRunning}
                            className={`px-12 py-4 h-20 mx-auto text-3xl font-bold rounded shadow-lg transition-all shrink-0 ${
                            isRunning ? 'bg-gray-500 cursor-not-allowed' : 'bg-[#538E3A] hover:bg-green-500 active:scale-95'
                            }`}
                        >
                            {isRunning ? 'RUNNING...' : 'RUN'}
                        </button>
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
    </div>
  );
}
