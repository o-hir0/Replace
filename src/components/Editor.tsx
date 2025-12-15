'use client';

import { useStore } from '@nanostores/react';
import { mainNodesStore, itemNodesStore, gameStateStore, selectedShopItemIndexStore, cycleCountStore, setShopFocusArea } from '../store/game';
import type { NodeItem } from '../store/game';

export default function Editor() {
  const nodes = useStore(mainNodesStore);
  const gameState = useStore(gameStateStore);
  const selectedShopItemIndex = useStore(selectedShopItemIndexStore);
  const cycleCount = useStore(cycleCountStore);

  // 編集不可の条件：
  // 1. ショップでアイテム選択中
  // 2. 3周目のバトル中（ショップでは編集可能）
  const isShop = gameState === 'SHOP';
  const isBattle = gameState === 'BATTLE';
  const isBoss = gameState === 'BOSS';
  const disableEditing =
    (isShop && selectedShopItemIndex !== null) ||
    (cycleCount >= 3 && isBattle);

  const removeNode = (index: number) => {
    const nodeToRemove = nodes[index];
    const newNodes = [...nodes];
    newNodes.splice(index, 1);
    mainNodesStore.set(newNodes);

    // Return to items if it's not a variable (variables might be special, but for now just return everything)
    // Actually, prompt says "return to Item column".
    // We should check if it's already in items to avoid duplicates if we want unique items, 
    // but for now let's just add it back.
    // To avoid ID conflicts if we add it back, maybe we should just make items available to copy?
    // The prompt says "Item column... click to add to main... click minus to return". 
    // This implies moving items back and forth.
    itemNodesStore.set([...itemNodesStore.get(), nodeToRemove]);

    import('../store/game').then(({ gamePlayStatsStore }) => {
      const stats = gamePlayStatsStore.get();
      gamePlayStatsStore.setKey('itemSwapCount', stats.itemSwapCount + 1);
    });
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newNodes = [...nodes];
      [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
      mainNodesStore.set(newNodes);
    } else if (direction === 'down' && index < nodes.length - 1) {
      const newNodes = [...nodes];
      [newNodes[index + 1], newNodes[index]] = [newNodes[index], newNodes[index + 1]];
      mainNodesStore.set(newNodes);
    }
  };

  return (
    <div
      className={`flex flex-col bg-gray-700 p-4 h-full relative ${disableEditing ? 'overflow-hidden' : 'overflow-y-auto'}`}
      onMouseEnter={() => { if (gameState === 'SHOP') setShopFocusArea('editor'); }}
      onMouseLeave={() => { if (gameState === 'SHOP') setShopFocusArea(null); }}
    >
      <div className={disableEditing ? 'opacity-40 pointer-events-none' : ''}>
        <h2 className="text-2xl text-white mb-4 text-center">Editer</h2>
        <div className="flex flex-col gap-2">
          {nodes.map((node, index) => (
            <div key={`${node.id}-${index}`} className="flex flex-col items-center">
              <div className="relative w-full bg-gray-300 rounded p-2 text-black font-mono flex justify-between items-center group">
                <span>{node.label}</span>
                <button
                  onClick={() => removeNode(index)}
                  className="p-1 w-6 h-6 flex items-center justify-center hover:scale-110 transition-transform bg-[#C4AE4B] rounded-full"
                >
                  <img src="/asset/ui/remove.svg" alt="remove" className="w-full h-full" />
                </button>
              </div>

              {/* Swap Controls (Visualized as arrows between nodes) */}
              {index < nodes.length - 1 && (
                <button
                  onClick={() => moveNode(index, 'down')}
                  className="my-1 hover:scale-110 transition-transform"
                >
                  <img src="/asset/ui/replace.svg" alt="swap" className="w-8 h-8" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {disableEditing && (cycleCount >= 3 && isBattle) && (
        <div className="absolute inset-0 bg-black/50 z-10 pointer-events-none flex items-center justify-center">
          <div className="text-white text-xl font-bold bg-black/70 px-6 py-3 rounded-lg">
            ボス戦まで編集不可
          </div>
        </div>
      )}
      {disableEditing && gameState === 'SHOP' && selectedShopItemIndex !== null && (
        <div className="absolute inset-0 bg-black/50 z-10 pointer-events-none" aria-hidden />
      )}
    </div>
  );
}
