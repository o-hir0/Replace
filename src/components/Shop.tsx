'use client';

import { useStore } from '@nanostores/react';
import { shopItemsStore, gameStateStore, currentEventIndexStore, selectedShopItemIndexStore, shopFocusAreaStore, setShopFocusArea, shopLogStore, advanceToNextEvent, startBattleEncounter, startBossEncounter } from '../store/game';

export default function Shop() {
  const shopItems = useStore(shopItemsStore);
  const selectedShopItemIndex = useStore(selectedShopItemIndexStore);
  const shopFocusArea = useStore(shopFocusAreaStore);
  const shopLogs = useStore(shopLogStore);

  const handleShopItemClick = (index: number) => {
    const current = selectedShopItemIndexStore.get();
    if (current === index) {
      selectedShopItemIndexStore.set(null);
    } else {
      selectedShopItemIndexStore.set(index);
    }
  };

  const handleExit = () => {
      selectedShopItemIndexStore.set(null);
      setShopFocusArea(null);
      const nextEvent = advanceToNextEvent();
      if (!nextEvent.event) return;
      if (nextEvent.wrapped || nextEvent.event === 'select') {
          gameStateStore.set('BOSS');
          currentEventIndexStore.set(-1);
          startBossEncounter();
      } else if (nextEvent.event === 'battle') {
          gameStateStore.set('BATTLE');
          startBattleEncounter();
      } else if (nextEvent.event === 'shop') {
          gameStateStore.set('SHOP');
      }
  };

  const shouldShadeShop = selectedShopItemIndex === null && (shopFocusArea === 'editor' || shopFocusArea === 'items');

  return (
    <div 
      className="flex flex-col h-full bg-[#A86637] relative overflow-hidden"
      onMouseEnter={() => setShopFocusArea('shop')}
      onMouseLeave={() => setShopFocusArea(null)}
    >
      {/* 1. Shop Roof Visuals (Red and White stripes) */}
      <div className="w-full h-36 flex shrink-0">
          {[...Array(6)].map((_, i) => (
              <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-[#CD163B]' : 'bg-[#D9D9D9]'}`}></div>
          ))}
      </div>
      
      {/* 2-4 Main body as grid rows */}
      <div className="flex-1 grid grid-rows-[minmax(140px,0.9fr)_minmax(0,1.6fr)_minmax(68px,0.5fr)] gap-3 px-4 md:px-6 pb-4 md:pb-6 pt-2 md:pt-3 min-h-0 overflow-hidden">
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-center h-full overflow-hidden min-h-0">
            <div className="flex flex-col items-center justify-center rounded-lg py-2 h-full">
                <h3 className="text-2xl font-bold text-yellow-200 mb-2">shop keeper</h3>
                <img src="/asset/ui/shoper.svg" alt="shop keeper" className="w-32 h-32 object-contain drop-shadow-lg"/>
            </div>
            <div className="bg-black/60 text-white rounded-lg p-3 h-full max-h-[150px] overflow-y-scroll shadow-inner min-h-0">
                {shopLogs.map((log, idx) => (
                    <div key={idx} className="text-sm font-mono mb-1 last:mb-0">{log}</div>
                ))}
            </div>
        </div>

        <div className="w-full max-w-4xl mx-auto bg-gray-700 p-4 md:p-6 rounded-lg shadow-inner flex flex-wrap justify-center gap-4 overflow-y-auto min-h-0">
            {shopItems.map((item, index) => (
                <button
                    key={item.id}
                    onClick={() => handleShopItemClick(index)}
                    className={`w-full max-w-[320px] h-[120px] bg-[#D9D9D9] border-8 border-[#C4AE4B] p-4 rounded-xl shadow-md flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 hover:bg-gray-50
                        ${selectedShopItemIndex === index 
                            ? 'bg-yellow-100 border-yellow-500 scale-105 shadow-[0_0_15px_rgba(255,215,0,0.7)]' 
                            : ''}`}
                >
                    <div className="w-10 h-10 mb-1">
                        <img src={`/asset/ui/${item.type}.svg`} alt={item.type} className="w-full h-full" />
                    </div>
                    <span className="font-mono font-bold text-gray-800">{item.label}</span>
                </button>
            ))}
        </div>

        <div className="w-full max-w-4xl mx-auto flex items-center justify-center mt-8">
            <button 
                onClick={handleExit}
                className="px-12 py-4 bg-[#538E3A] hover:bg-green-500 text-white text-2xl font-bold rounded shadow-lg"
            >
                店を出る
            </button>
        </div>
      </div>
      
      {shouldShadeShop && (
          <div className="absolute inset-0 bg-black/50 z-40 pointer-events-none" aria-hidden />
      )}
    </div>
  );
}
