'use client';

import { useStore } from '@nanostores/react';
import { itemNodesStore, mainNodesStore, gameStateStore, selectedShopItemIndexStore, handleShopSwap, setShopFocusArea } from '../store/game';

export default function Items() {
  const items = useStore(itemNodesStore);
  const gameState = useStore(gameStateStore);
  const selectedShopItemIndex = useStore(selectedShopItemIndexStore);

  const isShop = gameState === 'SHOP';
  const isSwapMode = isShop && selectedShopItemIndex !== null;
  
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
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
                if (isSwapMode) {
                  handleShopSwap(index);
                  return;
                }

                const newItems = [...items];
                newItems.splice(index, 1);
                itemNodesStore.set(newItems);
                mainNodesStore.set([...mainNodesStore.get(), item]);
            }}
            className={`w-full max-w-[260px] h-[120px] bg-[#D9D9D9] border-8 border-[#C4AE4B] p-4 rounded-xl shadow-md flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 hover:bg-gray-50
                ${isShop ? 'cursor-pointer' : ''} ${isSwapMode ? 'ring-2 ring-yellow-300' : ''}`}
          >
            {/* Icon placeholder */}
            <div className="w-12 h-12">
               <img 
                 src={`/asset/ui/${item.type}.svg`} 
                 alt={item.type}
                 className="w-full h-full"
               />
            </div>
            <span className="font-mono font-bold text-gray-800">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
