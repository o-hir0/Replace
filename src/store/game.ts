import { atom, map } from 'nanostores';
import type { ElementType } from '../lib/itemDefinitions';

export type Entity = {
  hp: number;
  maxHp: number;
  atk: number;
  bp: number;
  maxBp: number;
  type?: ElementType; // 敵の属性タイプ
  atkType?: ElementType; // プレイヤーの攻撃タイプ
};

export type NodeType = 'attack' | 'heal' | 'syntax' | 'behavior' | 'element';

export type NodeItem = {
  id: string;
  label: string; // ユーザーに表示される名前（例: "atk+=2", "n=3"）
  code?: string; // 後方互換性のため残す（transpilerで自動生成されるため不要になる）
  type: NodeType;
  indent?: number; // 視覚的なインデント
};

export type GameState = 'START' | 'MAP' | 'BATTLE' | 'SHOP' | 'BOSS';
export type EventType = 'select' | 'battle' | 'shop';
export type ShopFocusArea = 'shop' | 'editor' | 'items' | null;
export type ShopLog = string;

export const gameStateStore = atom<GameState>('MAP'); // Start at MAP for now to test
export const eventsStore = atom<EventType[]>([]); // Will be populated on map selection
export const currentEventIndexStore = atom<number>(0);
export const traversalDirectionStore = atom<1 | -1>(1);
export const battleCountStore = atom<number>(0);

// アイテム獲得モーダル用のストア
export const showItemRewardModalStore = atom<boolean>(false);
export const rewardItemsStore = atom<NodeItem[]>([]);

const baseEnemyStats: Entity = {
  hp: 10,
  maxHp: 10,
  atk: 20,
  bp: 5,
  maxBp: 5,
  type: 'fire', // デフォルトの敵タイプ
};

const bossStats: Entity = {
  hp: 80,
  maxHp: 80,
  atk: 30,
  bp: 8,
  maxBp: 8,
  type: 'grass', // ボスのタイプ
};

export const selectedShopItemIndexStore = atom<number | null>(null);
export const shopFocusAreaStore = atom<ShopFocusArea>(null);
export const shopLogStore = atom<ShopLog[]>([
  'よく来たね！早速、手持ちのアイテムと交換する商品を選んでもいいし、EditerエリアとItemエリアで手持ちを整理してから選んでもいいよ！',
]);

export const setShopFocusArea = (area: ShopFocusArea) => {
  shopFocusAreaStore.set(area);
};

export const addShopLog = (msg: ShopLog) => {
  shopLogStore.set([...shopLogStore.get(), msg]);
};

export const advanceToNextEvent = (): { event: EventType | null; wrapped: boolean } => {
  const dir = traversalDirectionStore.get();
  const events = eventsStore.get();
  if (events.length <= 1) return { event: null, wrapped: false };
  const current = currentEventIndexStore.get();
  let next = current + dir;
  let wrapped = false;
  if (next <= 0) {
    next = events.length - 1; // wrap, skip select node when going backward
    wrapped = true;
  }
  if (next >= events.length) {
    next = 1;     // wrap forward, skip select node
    wrapped = true;
  }
  currentEventIndexStore.set(next);
  return { event: events[next], wrapped };
};

export const computeScaledEnemyStats = (count: number): Entity => {
  const hp = baseEnemyStats.maxHp + count * 8;
  const bp = baseEnemyStats.maxBp + Math.floor(count / 2);
  const atk = baseEnemyStats.atk + count * 2;

  // 敵のタイプをランダムに決定
  const types: ElementType[] = ['water', 'fire', 'grass'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  return {
    hp,
    maxHp: hp,
    atk,
    bp,
    maxBp: bp,
    type: randomType,
  };
};

export const startBattleEncounter = () => {
  const count = battleCountStore.get();
  const stats = computeScaledEnemyStats(count);
  enemyStore.set(stats);
  battleCountStore.set(count + 1);

  const typeNames: Record<ElementType, string> = {
    water: '水',
    fire: '炎',
    grass: '草',
  };
  const typeName = typeNames[stats.type as ElementType];
  addLog(`${typeName}タイプの敵が現れた！`);
};

export const startBossEncounter = () => {
  enemyStore.set(bossStats);

  const typeNames: Record<ElementType, string> = {
    water: '水',
    fire: '炎',
    grass: '草',
  };
  const typeName = typeNames[bossStats.type as ElementType];
  addLog(`${typeName}タイプのボスが現れた！`);
};

export const handleShopSwap = (inventoryIndex: number) => {
  const selectedShopIndex = selectedShopItemIndexStore.get();
  if (selectedShopIndex === null) return;

  const shopItems = shopItemsStore.get();
  const inventoryItems = itemNodesStore.get();
  
  const newShopItems = [...shopItems];
  const newInventoryItems = [...inventoryItems];
  
  const shopItem = newShopItems[selectedShopIndex];
  const inventoryItem = newInventoryItems[inventoryIndex];
  
  newShopItems[selectedShopIndex] = inventoryItem;
  newInventoryItems[inventoryIndex] = shopItem;
  
  shopItemsStore.set(newShopItems);
  itemNodesStore.set(newInventoryItems);
  
  selectedShopItemIndexStore.set(null);
  addShopLog(`「${inventoryItem.label}」と「${shopItem.label}」を交換したよ！`);
};

/**
 * アイテムをラベルから簡単に生成するヘルパー関数
 */
export const createItem = (id: string, label: string, type: NodeType): NodeItem => ({
  id,
  label,
  type,
});

// Shop items (より汎用的な定義)
export const shopItemsStore = atom<NodeItem[]>([
  createItem('shop-1', 'atk+=1', 'attack'),
  createItem('shop-2', 'hp+=2', 'heal'),
  createItem('shop-3', 'n.times do', 'syntax'),
  createItem('shop-4', 'atkType=water', 'element'),
  createItem('shop-5', 'bp+=1', 'behavior'),
  createItem('shop-6', 'if enemyType=fire', 'syntax'),
  createItem('shop-7', 'atk+=2', 'attack'),
  createItem('shop-8', 'hp+=1', 'heal'),
  createItem('shop-9', 'enemyType=searchEnemyTypes()', 'element'),
]);

export const playerStore = map<Entity>({
  hp: 120,
  maxHp: 120,
  atk: 20,
  bp: 10,
  maxBp: 10,
});

export const enemyStore = map<Entity>({ ...baseEnemyStats });

export const mainNodesStore = atom<NodeItem[]>([
  createItem('main-1', 'n=3', 'syntax'),
]);

// 初期アイテム（汎用的な定義）
export const itemNodesStore = atom<NodeItem[]>([
  createItem('item-1', 'atk()', 'attack'),
  createItem('item-2', 'atk+=1', 'attack'),
  createItem('item-3', 'hp+=1', 'heal'),
  createItem('item-4', 'bp+=1', 'behavior'),
]);

export const logStore = atom<string[]>([]);

export const addLog = (msg: string) => {
  logStore.set([...logStore.get(), msg]);
};

/**
 * ランダムにアイテムを生成する関数
 */
const generateRandomItem = (id: string): NodeItem => {
  const itemPool = [
    { label: 'atk+=1', type: 'attack' as NodeType },
    { label: 'atk+=2', type: 'attack' as NodeType },
    { label: 'atk+=3', type: 'attack' as NodeType },
    { label: 'hp+=1', type: 'heal' as NodeType },
    { label: 'hp+=2', type: 'heal' as NodeType },
    { label: 'hp+=3', type: 'heal' as NodeType },
    { label: 'bp+=1', type: 'behavior' as NodeType },
    { label: 'bp+=2', type: 'behavior' as NodeType },
    { label: 'bp+=3', type: 'behavior' as NodeType },
    { label: 'n=1', type: 'syntax' as NodeType },
    { label: 'n=2', type: 'syntax' as NodeType },
    { label: 'n=3', type: 'syntax' as NodeType },
    { label: 'n.times do', type: 'syntax' as NodeType },
    { label: 'end', type: 'syntax' as NodeType },
    { label: 'atk()', type: 'attack' as NodeType },
    { label: 'atkType=water', type: 'element' as NodeType },
    { label: 'atkType=fire', type: 'element' as NodeType },
    { label: 'atkType=grass', type: 'element' as NodeType },
    { label: 'enemyType=searchEnemyTypes()', type: 'element' as NodeType },
    { label: 'if enemyType=water', type: 'syntax' as NodeType },
    { label: 'if enemyType=fire', type: 'syntax' as NodeType },
    { label: 'if enemyType=grass', type: 'syntax' as NodeType },
  ];

  const randomItem = itemPool[Math.floor(Math.random() * itemPool.length)];
  return createItem(id, randomItem.label, randomItem.type);
};

/**
 * 戦闘勝利時にランダムアイテムを2個獲得
 */
export const generateRewardItems = () => {
  const rewards = [
    generateRandomItem(`reward-${Date.now()}-1`),
    generateRandomItem(`reward-${Date.now()}-2`),
  ];
  rewardItemsStore.set(rewards);
  showItemRewardModalStore.set(true);
};
