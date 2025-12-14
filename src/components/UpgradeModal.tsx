'use client';

import { useStore } from '@nanostores/react';
import {
    showUpgradeModalStore,
    itemNodesStore,
    mainNodesStore,
    gameStateStore,
    currentEventIndexStore,
    eventsStore,
    advanceToNextEvent,
    startBattleEncounter,
    startBossEncounter,
    generateFixedRewardItems,
    createItem,
    type NodeType,
    type NodeItem,
} from '../store/game';
import { useState } from 'react';

// アップグレード可能なアイテムの定義
const upgradeMap: Record<string, { nextLabel: string; type: NodeType }> = {
    'atk+=1': { nextLabel: 'atk+=2', type: 'attack' },
    'atk+=2': { nextLabel: 'atk+=3', type: 'attack' },
    'hp+=1': { nextLabel: 'hp+=2', type: 'heal' },
    'hp+=2': { nextLabel: 'hp+=3', type: 'heal' },
    'bp+=1': { nextLabel: 'bp+=2', type: 'behavior' },
    'bp+=2': { nextLabel: 'bp+=3', type: 'behavior' },
};

export default function UpgradeModal() {
    const showModal = useStore(showUpgradeModalStore);
    const inventoryItems = useStore(itemNodesStore);
    const editorItems = useStore(mainNodesStore);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedSource, setSelectedSource] = useState<'inventory' | 'editor' | null>(null);

    if (!showModal) return null;

    // アップグレード可能なアイテムを収集
    const upgradableItems: (NodeItem & { source: 'inventory' | 'editor' })[] = [];

    // インベントリから
    inventoryItems.forEach((item) => {
        if (upgradeMap[item.label]) {
            upgradableItems.push({ ...item, source: 'inventory' });
        }
    });

    // エディタから
    editorItems.forEach((item) => {
        if (upgradeMap[item.label]) {
            upgradableItems.push({ ...item, source: 'editor' });
        }
    });

    const handleUpgrade = () => {
        if (!selectedItemId || !selectedSource) return;

        let targetStore = selectedSource === 'inventory' ? itemNodesStore : mainNodesStore;
        let items = targetStore.get();

        const targetItem = items.find((i) => i.id === selectedItemId);
        if (!targetItem) return;

        const upgradeInfo = upgradeMap[targetItem.label];
        if (!upgradeInfo) return;

        // 新しいアイテムを作成
        const newItem = createItem(
            `upgraded-${targetItem.id}-${Date.now()}`,
            upgradeInfo.nextLabel,
            upgradeInfo.type
        );

        // 指定されたストアを更新
        const newItems = items.map((item) =>
            item.id === selectedItemId ? newItem : item
        );
        targetStore.set(newItems);

        handleClose();
    };

    const handleSkip = () => {
        handleClose();
    };

    const handleClose = () => {
        showUpgradeModalStore.set(false);
        setSelectedItemId(null);
        setSelectedSource(null);

        // 次のイベントへ
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
            // 連続してアップグレードは稀だが対応
            showUpgradeModalStore.set(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 border-blue-500">
                <h2 className="text-3xl font-bold text-blue-400 text-center mb-2">
                    アイテム強化
                </h2>
                <p className="text-gray-300 text-center mb-6">
                    手持ちのアイテムを1つ選んで強化できます
                </p>

                {upgradableItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        強化可能なアイテムを持っていません
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 mb-8 max-h-[300px] overflow-y-auto p-2">
                        {upgradableItems.map((item) => {
                            const upgradeInfo = upgradeMap[item.label];
                            const isSelected = selectedItemId === item.id;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedItemId(item.id);
                                        setSelectedSource(item.source);
                                    }}
                                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2
                    ${isSelected
                                            ? 'bg-blue-900/50 border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]'
                                            : 'bg-gray-700 border-gray-600 hover:border-gray-400'}`}
                                >
                                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/50 text-gray-400">
                                        {item.source === 'inventory' ? 'ITEM' : 'EDITOR'}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`/asset/ui/${item.type}.svg`}
                                            alt={item.type}
                                            className="w-10 h-10"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-white">{item.label}</span>
                                            <span className="text-xs text-gray-400">↓</span>
                                            <span className="font-mono font-bold text-green-400">{upgradeInfo.nextLabel}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <button
                        onClick={handleSkip}
                        className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition-colors"
                    >
                        スキップ
                    </button>
                    <button
                        onClick={handleUpgrade}
                        disabled={!selectedItemId}
                        className={`px-8 py-3 font-bold rounded-lg transition-colors shadow-lg
              ${selectedItemId
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                    >
                        強化する
                    </button>
                </div>
            </div>
        </div>
    );
}
