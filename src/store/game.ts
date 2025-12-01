import { atom, map } from 'nanostores';

export type Entity = {
  hp: number;
  maxHp: number;
  atk: number;
  bp: number;
  maxBp: number;
};

export type NodeType = 'attack' | 'heal' | 'syntax' | 'behavior';

export type NodeItem = {
  id: string;
  label: string;
  code: string; // The actual code snippet
  type: NodeType;
  indent?: number; // For visual indentation if we want
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

const baseEnemyStats: Entity = {
  hp: 10,
  maxHp: 10,
  atk: 20,
  bp: 5,
  maxBp: 5,
};

const bossStats: Entity = {
  hp: 80,
  maxHp: 80,
  atk: 30,
  bp: 8,
  maxBp: 8,
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

export const computeScaledEnemyStats = (count: number) => {
  const hp = baseEnemyStats.maxHp + count * 8;
  const bp = baseEnemyStats.maxBp + Math.floor(count / 2);
  const atk = baseEnemyStats.atk + count * 2;
  return {
    hp,
    maxHp: hp,
    atk,
    bp,
    maxBp: bp,
  };
};

export const startBattleEncounter = () => {
  const count = battleCountStore.get();
  const stats = computeScaledEnemyStats(count);
  enemyStore.set(stats);
  battleCountStore.set(count + 1);
};

export const startBossEncounter = () => {
  enemyStore.set(bossStats);
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

// Shop items (randomly generated or fixed for now)
export const shopItemsStore = atom<NodeItem[]>([
  { id: 'shop-1', label: 'atk+=1', code: 'atk_inc()', type: 'attack' },
  { id: 'shop-2', label: 'hp+=1', code: 'heal()', type: 'heal' },
  { id: 'shop-3', label: 'n.times do', code: 'n.times do', type: 'syntax' },
  { id: 'shop-4', label: 'atk+=1', code: 'atk_inc()', type: 'attack' },
  { id: 'shop-5', label: 'hp+=1', code: 'heal()', type: 'heal' },
  { id: 'shop-6', label: 'n.times do', code: 'n.times do', type: 'syntax' },
  { id: 'shop-7', label: 'atk+=1', code: 'atk_inc()', type: 'attack' },
  { id: 'shop-8', label: 'hp+=1', code: 'heal()', type: 'heal' },
  { id: 'shop-9', label: 'n.times do', code: 'n.times do', type: 'syntax' },
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
  { id: '1', label: 'n=5', code: 'n=5', type: 'syntax' },
]);

// Initial available items
export const itemNodesStore = atom<NodeItem[]>([
  { id: 'item-1', label: 'atk()', code: 'await atk()', type: 'attack' },
  { id: 'item-2', label: 'atk+=1', code: 'atk_inc()', type: 'attack' },
  { id: 'item-3', label: 'n.times do', code: 'for(let i=0; i<n; i++) {', type: 'syntax' },
  { id: 'item-4', label: 'hp+=1', code: 'heal()', type: 'heal' },
  { id: 'item-5', label: 'end', code: '}', type: 'syntax' },
  { id: 'item-6', label: 'bp+=1', code: 'bp_inc()', type: 'behavior' },
]);

export const logStore = atom<string[]>([]);

export const addLog = (msg: string) => {
  logStore.set([...logStore.get(), msg]);
};
