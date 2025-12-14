'use client';

import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { itemNodesStore, mainNodesStore, gameStateStore, selectedShopItemIndexStore, cycleCountStore, handleShopSwap, setShopFocusArea } from '../store/game';
import { getItemDescription } from '../lib/itemDefinitions';
import { ScrollLabel } from './ScrollLabel';

export default function Items() {
  const items = useStore(itemNodesStore);
  const gameState = useStore(gameStateStore);
  const selectedShopItemIndex = useStore(selectedShopItemIndexStore);
  const cycleCount = useStore(cycleCountStore);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState<number | null>(null);

  const isShop = gameState === 'SHOP';
  const isBattle = gameState === 'BATTLE';
  const isSwapMode = isShop && selectedShopItemIndex !== null;

  // ロック条件：3周目のバトル中のみ（ショップでは編集可能、ボス戦では編集可能）
  const isLocked = cycleCount >= 3 && isBattle;

  return (
    <div
      className="flex flex-col bg-gray-600 p-4 h-full overflow-y-auto relative"
      onMouseEnter={() => { if (isShop) setShopFocusArea('items'); }}
      onMouseLeave={() => { if (isShop) setShopFocusArea(null); }}
    >
      <h2 className="text-2xl text-white mb-4 text-center">
        Item {isSwapMode && <span className="text-sm font-normal text-yellow-200">(交換モード)</span>}
      </h2>
      <div className="flex flex-col items-center gap-4">
        {items.map((item, index) => {
          const isHovered = hoveredItemIndex === index;
          const isShowingInfo = showInfo === index;

          return (
            <div
              key={item.id}
              className="relative w-full max-w-[260px] h-[120px]"
              onMouseEnter={() => setHoveredItemIndex(index)}
              onMouseLeave={() => {
                setHoveredItemIndex(null);
                setShowInfo(null);
              }}
            >
              <button
                onClick={() => {
                  if (isLocked && !isSwapMode) return;

                  if (isSwapMode) {
                    handleShopSwap(index);
                    return;
                  }

                  const newItems = [...items];
                  newItems.splice(index, 1);
                  itemNodesStore.set(newItems);
                  mainNodesStore.set([...mainNodesStore.get(), item]);

                  import('../store/game').then(({ gamePlayStatsStore }) => {
                    const stats = gamePlayStatsStore.get();
                    gamePlayStatsStore.setKey('itemSwapCount', stats.itemSwapCount + 1);
                  });
                }}
                disabled={isLocked && !isSwapMode}
                className={`w-full h-full bg-[#D9D9D9] border-8 border-[#C4AE4B] p-4 rounded-xl shadow-md transition-transform active:scale-95 hover:bg-gray-50 relative
                  ${isShop ? 'cursor-pointer' : ''} ${isSwapMode ? 'ring-2 ring-yellow-300' : ''} ${isLocked && !isSwapMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {!isShowingInfo ? (
                  <>
                    <div className="w-12 h-12 mx-auto">
                      <img
                        src={`/asset/ui/${item.type}.svg`}
                        alt={item.type}
                        className="w-full h-full"
                      />
                    </div>
                    <ScrollLabel text={item.label} containerClassName="mt-2" />
                  </>
                ) : (
                  <div className="w-full h-full overflow-y-auto text-left p-2">
                    <p className="text-sm text-gray-800 leading-relaxed">{getItemDescription(item.label)}</p>
                  </div>
                )}
              </button>

              {isHovered && !isShowingInfo && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(index);
                  }}
                  className="absolute top-3 right-3 w-6 h-6 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <img src="/asset/ui/info.svg" alt="info" className="w-full h-full pointer-events-none" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ロックシャドウ */}
      {isLocked && !isSwapMode && (
        <div className="absolute inset-0 bg-black/50 z-40 pointer-events-none flex items-center justify-center">
          <div className="text-white text-xl font-bold bg-black/70 px-6 py-3 rounded-lg">
            ボス戦まで編集不可
          </div>
        </div>
      )}
    </div>
  );
}
