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

const enemySpriteOptions = Array.from({ length: 11 }, (_, idx) => `/asset/enemy/enemy-${String(idx + 1).padStart(2, '0')}.svg`);
const pickRandomEnemySprite = () => enemySpriteOptions[Math.floor(Math.random() * enemySpriteOptions.length)];

export const EVENTS_COUNT = 8;

export const buildDefaultEvents = () => {
  const newEvents: EventType[] = ['select']; // first is always selection
  for (let i = 1; i < EVENTS_COUNT; i++) {
    if (i === EVENTS_COUNT - 1) {
      newEvents.push('battle'); // Boss (treated as battle for now)
    } else {
      // Simple alternating pattern for demo
      newEvents.push((i - 1) % 2 === 0 ? 'battle' : 'shop');
    }
  }
  return newEvents;
};

export const gameStateStore = atom<GameState>('MAP'); // Start at MAP for now to test
export const eventsStore = atom<EventType[]>([]); // Will be populated on map selection
export const currentEventIndexStore = atom<number>(0);
export const traversalDirectionStore = atom<1 | -1>(1);
export const battleCountStore = atom<number>(0);
export const cycleCountStore = atom<number>(1); // 現在の周回数 (1-3)

// アイテム獲得モーダル用のストア
export const showItemRewardModalStore = atom<boolean>(false);
export const rewardItemsStore = atom<NodeItem[]>([]);

// ゲーム結果モーダル用のストア
export const gameResultStore = atom<'clear' | 'over' | null>(null);

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

export const advanceToNextEvent = (): { event: EventType | null; wrapped: boolean; shouldResetMap?: boolean } => {
  const dir = traversalDirectionStore.get();
  const events = eventsStore.get();
  if (events.length <= 1) return { event: null, wrapped: false };
  const current = currentEventIndexStore.get();
  let next = current + dir;
  let wrapped = false;

  // 左回り（後方）のラップ処理
  if (next <= 0) {
    const currentCycle = cycleCountStore.get();
    if (currentCycle >= 3) {
      // 3周目終了後はボス戦へ
      return { event: 'select', wrapped: true };
    } else {
      // 次の周回へ
      const nextCycle = currentCycle + 1;
      cycleCountStore.set(nextCycle);
      next = events.length - 1; // wrap backward, skip select node
      wrapped = true;
      currentEventIndexStore.set(next);
      // マップをリセットして次の周回を開始
      return { event: events[next], wrapped: true, shouldResetMap: true };
    }
  }

  // 右回り（前方）のラップ処理
  if (next >= events.length) {
    const currentCycle = cycleCountStore.get();
    if (currentCycle >= 3) {
      // 3周目終了後はボス戦へ
      return { event: 'select', wrapped: true };
    } else {
      // 次の周回へ
      const nextCycle = currentCycle + 1;
      cycleCountStore.set(nextCycle);
      next = 1;     // wrap forward, skip select node
      wrapped = true;
      currentEventIndexStore.set(next);
      // マップをリセットして次の周回を開始
      return { event: events[next], wrapped: true, shouldResetMap: true };
    }
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
  enemySpriteStore.set(pickRandomEnemySprite());
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
  const bossSprite = bossSpriteStore.get() || pickRandomEnemySprite();
  enemySpriteStore.set(bossSprite);

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

const generateRandomShopItems = (count: number = 6): NodeItem[] => {
  return Array.from({ length: count }, (_, idx) =>
    generateRandomItem(`shop-${Date.now()}-${idx}`)
  );
};

// Shop items (より汎用的な定義)
export const shopItemsStore = atom<NodeItem[]>(generateRandomShopItems());

const initialPlayer: Entity = {
  hp: 120,
  maxHp: 120,
  atk: 20,
  bp: 1,
  maxBp: 10,
  atkType: undefined,
};

export const playerStore = map<Entity>({ ...initialPlayer });

export const enemyStore = map<Entity>({ ...baseEnemyStats });
export const enemySpriteStore = atom<string>(enemySpriteOptions[0]);
export const bossSpriteStore = atom<string>(enemySpriteOptions[0]);

const initialMainNodes: NodeItem[] = [
  createItem('main-1', 'n=3', 'syntax'),
];

export const mainNodesStore = atom<NodeItem[]>(initialMainNodes);

// 初期アイテム（汎用的な定義）
const initialItems: NodeItem[] = [
  createItem('item-1', 'atk()', 'attack'),
  createItem('item-2', 'atk+=1', 'attack'),
  createItem('item-3', 'hp+=1', 'heal'),
  createItem('item-4', 'bp+=1', 'behavior'),
  createItem('item-5', 'enemyType=searchEnemyTypes()', 'element'),
  createItem('item-6', 'if enemyType=water', 'element'),
  createItem('item-7', 'if enemyType=fire', 'element'),
  createItem('item-8', 'if enemyType=grass', 'element'),
  createItem('item-9', 'end', 'syntax'),
  createItem('item-10', 'end', 'syntax'),
  createItem('item-11', 'atkType=water', 'element'),
  createItem('item-12', 'atkType=grass', 'element'),
  createItem('item-13', 'atkType=fire', 'element'),
  createItem('item-14', 'n.times do', 'syntax'),
];

export const itemNodesStore = atom<NodeItem[]>(initialItems);

export const logStore = atom<string[]>([]);

export const addLog = (msg: string) => {
  logStore.set([...logStore.get(), msg]);
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

/**
 * ゲーム状態を初期値にリセットする関数
 */
export const resetGameState = () => {
  // プレイヤーを初期状態にリセット
  playerStore.set({ ...initialPlayer });

  // 敵を初期状態にリセット
  enemyStore.set({ ...baseEnemyStats });
  const bossSprite = pickRandomEnemySprite();
  bossSpriteStore.set(bossSprite);
  enemySpriteStore.set(bossSprite);

  // エディタを初期状態にリセット
  mainNodesStore.set([...initialMainNodes]);

  // アイテムを初期状態にリセット
  itemNodesStore.set([...initialItems]);

  // ショップアイテムを初期状態にリセット
  shopItemsStore.set(generateRandomShopItems());

  // ログをクリア
  logStore.set([]);

  // ゲーム進行状態をリセット
  gameStateStore.set('MAP');
  const baseEvents = buildDefaultEvents();
  eventsStore.set(baseEvents);
  currentEventIndexStore.set(0);
  traversalDirectionStore.set(1);
  battleCountStore.set(0);
  cycleCountStore.set(1);

  // モーダルをクリア
  showItemRewardModalStore.set(false);
  rewardItemsStore.set([]);
  gameResultStore.set(null);

  // ショップ関連をリセット
  selectedShopItemIndexStore.set(null);
  shopFocusAreaStore.set(null);
  shopLogStore.set([
    'よく来たね！早速、手持ちのアイテムと交換する商品を選んでもいいし、EditerエリアとItemエリアで手持ちを整理してから選んでもいいよ！',
  ]);
};
