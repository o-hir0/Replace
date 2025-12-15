'use client';

import { useStore } from '@nanostores/react';
import {
  showItemRewardModalStore,
  rewardItemsStore,
  itemNodesStore,
  gameStateStore,
  currentEventIndexStore,
  eventsStore,
  advanceToNextEvent,
  startBattleEncounter,
  startBossEncounter,
  generateFixedRewardItems,
  showUpgradeModalStore,
} from '../store/game';
import { getItemDescription } from '../lib/itemDefinitions';
import { useState } from 'react';

export default function ItemRewardModal() {
  const showModal = useStore(showItemRewardModalStore);
  const rewardItems = useStore(rewardItemsStore);
  const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState<number | null>(null);

  if (!showModal) return null;

  const displayItems = rewardItems.length > 4 ? rewardItems.slice(0, 4) : rewardItems;
  const hiddenCount = rewardItems.length - displayItems.length;

  const handleNext = () => {
    // アイテムをインベントリに追加
    const currentItems = itemNodesStore.get();
    itemNodesStore.set([...currentItems, ...rewardItems]);

    // モーダルを閉じる
    showItemRewardModalStore.set(false);
    rewardItemsStore.set([]);

    // 次のイベントに進む
    const nextEvent = advanceToNextEvent();
    if (!nextEvent.event) return;

    if (nextEvent.event === 'select') {
      gameStateStore.set('BOSS');
      currentEventIndexStore.set(-1);
      startBossEncounter();
    } else if (nextEvent.event === 'battle') {
      gameStateStore.set('BATTLE');
      startBattleEncounter();
    } else if (nextEvent.event === 'shop') {
      gameStateStore.set('SHOP');
    } else if (nextEvent.event === 'reward') {
      generateFixedRewardItems();
    } else if (nextEvent.event === 'upgrade') {
      showUpgradeModalStore.set(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 border-yellow-500">
        <h2 className="text-3xl font-bold text-yellow-400 text-center mb-6">
          アイテムを獲得した！
        </h2>

        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {displayItems.map((item, index) => {
            const isHovered = hoveredItemIndex === index;
            const isShowingInfo = showInfo === index;

            return (
              <div
                key={item.id}
                className="relative w-full max-w-[280px] h-[140px]"
                onMouseEnter={() => setHoveredItemIndex(index)}
                onMouseLeave={() => {
                  setHoveredItemIndex(null);
                  setShowInfo(null);
                }}
              >
                <div
                  className={`w-full h-full bg-[#D9D9D9] border-8 border-[#C4AE4B] p-4 rounded-xl shadow-lg relative
                    ${isHovered ? 'scale-105 transition-transform' : ''}`}
                >
                  {!isShowingInfo ? (
                    <>
                      <div className="w-14 h-14 mx-auto mb-2">
                        <img
                          src={`/asset/ui/${item.type}.svg`}
                          alt={item.type}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="font-mono font-bold text-gray-800 block text-center text-lg">
                        {item.label}
                      </span>
                    </>
                  ) : (
                    <div className="w-full h-full overflow-y-auto text-left p-2">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {getItemDescription(item.label)}
                      </p>
                    </div>
                  )}
                </div>

                {isHovered && !isShowingInfo && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfo(index);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <img
                      src="/asset/ui/info.svg"
                      alt="info"
                      className="w-full h-full pointer-events-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {hiddenCount > 0 && (
            <div className="flex items-center justify-center w-[140px] h-[140px] text-yellow-400 font-bold text-xl">
              他 {hiddenCount} 個...
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-lg shadow-lg transition-colors"
          >
            次に進む
          </button>
        </div>
      </div>
    </div>
  );
}
