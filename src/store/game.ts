import { atom, map } from 'nanostores';
import type { ElementType } from '../lib/itemDefinitions';

export type Entity = {
  hp: number;
  atk: number;
  bp: number;
  type?: ElementType; // 敵の属性タイプ
  atkType?: ElementType; // プレイヤーの攻撃タイプ
};

export type NodeType = 'attack' | 'heal' | 'syntax' | 'behavior' | 'element' | 'debuff';

export type NodeItem = {
  id: string;
  label: string; // ユーザーに表示される名前（例: "atk+=2", "n=3"）
  code?: string; // 後方互換性のため残す（transpilerで自動生成されるため不要になる）
  type: NodeType;
  indent?: number; // 視覚的なインデント
};

export type GameState = 'START' | 'MAP' | 'BATTLE' | 'SHOP' | 'BOSS';
export type EventType = 'select' | 'battle' | 'shop' | 'reward' | 'upgrade';
export type ShopFocusArea = 'shop' | 'editor' | 'items' | null;
export type ShopLog = string;

const enemySpriteOptions = Array.from({ length: 11 }, (_, idx) => `/asset/enemy/enemy-${String(idx + 1).padStart(2, '0')}.svg`);
const pickRandomEnemySprite = () => enemySpriteOptions[Math.floor(Math.random() * enemySpriteOptions.length)];

export const EVENTS_COUNT = 8;

export const buildDefaultEvents = (cycle: number = 1): EventType[] => {
  // New Cycle Pattern:
  // 1-2: Battle -> Upgrade -> Battle -> Reward(Fixed) ... -> Battle
  // 3+: Battle -> Upgrade -> Battle -> Upgrade ... -> Shop (Before Boss)
  const rewardNode = cycle >= 3 ? 'upgrade' : 'reward';

  // 1: Battle
  // 2: Upgrade
  // 3: Battle
  // 4: Reward / Upgrade
  // 5: Battle
  // 6: Battle
  // 7: Shop / Battle (Cycle 3+ is Shop)
  if (cycle >= 3) {
    // 3+: ... -> Battle -> Shop(7)
    return ['select', 'battle', 'upgrade', 'battle', rewardNode, 'battle', 'battle', 'shop'];
  } else {
    // 1-2: ... -> Shop(6) -> Battle(7) (Original)
    return ['select', 'battle', 'upgrade', 'battle', rewardNode, 'battle', 'shop', 'battle'];
  }
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

// アップグレードモーダル用のストア
export const showUpgradeModalStore = atom<boolean>(false);

// ゲーム結果モーダル用のストア
export const gameResultStore = atom<'clear' | 'over' | null>(null);

const baseEnemyStats: Entity = {
  hp: 20,
  atk: 10,
  bp: 1,
  type: 'fire', // デフォルトの敵タイプ
};

const bossStats: Entity = {
  hp: 1500,
  atk: 30,
  bp: 3,
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

      // イベント情報を更新 (3周目以降の変化などを反映)
      const nextEvents = buildDefaultEvents(nextCycle);
      eventsStore.set(nextEvents);

      next = nextEvents.length - 1; // wrap backward, skip select node
      wrapped = true;
      currentEventIndexStore.set(next);
      // マップをリセットして次の周回を開始
      return { event: nextEvents[next], wrapped: true, shouldResetMap: true };
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

      // イベント情報を更新 (3周目以降の変化などを反映)
      const nextEvents = buildDefaultEvents(nextCycle);
      eventsStore.set(nextEvents);

      next = 1;     // wrap forward, skip select node
      wrapped = true;
      currentEventIndexStore.set(next);
      // マップをリセットして次の周回を開始
      return { event: nextEvents[next], wrapped: true, shouldResetMap: true };
    }
  }

  currentEventIndexStore.set(next);
  return { event: events[next], wrapped };
};

export const computeScaledEnemyStats = (count: number): Entity => {
  const cycle = cycleCountStore.get();

  // バトル数による増加
  let hp = baseEnemyStats.hp + count * 30;
  let bp = baseEnemyStats.bp + Math.floor(count / 4);
  let atk = baseEnemyStats.atk + Math.floor(count / 2);

  // 周回数による大幅な難易度上昇 (2周目以降)
  if (cycle > 1) {
    hp += (cycle - 1) * 50;
    atk += (cycle - 1);
  }

  // 敵のタイプをランダムに決定
  const types: ElementType[] = ['water', 'fire', 'grass'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  return {
    hp,
    atk,
    bp,
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

  const stats = gamePlayStatsStore.get();
  gamePlayStatsStore.setKey('shopTradeCount', stats.shopTradeCount + 1);
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
 * ランダムにアイテムを生成する関数 (重み付けあり)
 */
const generateRandomItem = (id: string, options?: { minRarity?: 'rare' }): NodeItem => {
  let rand = Math.random();

  // 最低レアリティ保証がある場合
  if (options?.minRarity === 'rare') {
    // 0.70 (Rare開始) 〜 1.0 の間で再抽選
    rand = 0.70 + (Math.random() * 0.30);
  }

  // 確率分布定義
  // Common (40%): 基本的な攻撃、構文
  // Uncommon (30%): 少し便利なアイテム
  // Rare (20%): 基本強化 (+1)
  // Epic (7%): 強力な強化 (+2)
  // Legendary (2.5%): 超強力な強化 (+3)
  // Mythic (0.5%): 神話級強化 (+4)

  let item = { label: 'atk()', type: 'attack' as NodeType };

  if (rand < 0.40) {
    // Common
    const pool = [
      { label: 'n=2', type: 'syntax' as NodeType },
      { label: 'end', type: 'syntax' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  } else if (rand < 0.70) {
    // Uncommon
    const pool = [
      { label: 'hp+=1', type: 'heal' as NodeType },
      { label: 'bp+=1', type: 'behavior' as NodeType },
      { label: 'n.times do', type: 'syntax' as NodeType },
      // 属性攻撃タイプ
      { label: 'atkType=water', type: 'element' as NodeType },
      { label: 'atkType=fire', type: 'element' as NodeType },
      { label: 'atkType=grass', type: 'element' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  } else if (rand < 0.90) {
    // Rare
    const pool = [
      { label: 'atk+=1', type: 'attack' as NodeType },
      { label: 'enemyAtk-=1', type: 'debuff' as NodeType },
      { label: 'n=3', type: 'syntax' as NodeType },
      { label: 'atk()', type: 'attack' as NodeType },
      // 敵属性判定
      { label: 'if enemyType=water', type: 'element' as NodeType },
      { label: 'if enemyType=fire', type: 'element' as NodeType },
      { label: 'if enemyType=grass', type: 'element' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  } else if (rand < 0.97) {
    // Epic
    const pool = [
      { label: 'atk+=2', type: 'attack' as NodeType },
      { label: 'bp+=2', type: 'behavior' as NodeType },
      { label: 'hp+=2', type: 'heal' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  } else if (rand < 0.995) {
    // Legendary
    const pool = [
      { label: 'atk+=3', type: 'attack' as NodeType },
      { label: 'bp+=3', type: 'behavior' as NodeType },
      { label: 'hp+=3', type: 'heal' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  } else {
    // Mythic
    const pool = [
      { label: 'atk+=4', type: 'attack' as NodeType },
      { label: 'bp+=4', type: 'behavior' as NodeType },
      { label: 'hp+=4', type: 'heal' as NodeType },
      { label: 'enemyBp-=1', type: 'debuff' as NodeType },
    ];
    item = pool[Math.floor(Math.random() * pool.length)];
  }

  return createItem(id, item.label, item.type);
};

const generateRandomShopItems = (count: number = 6): NodeItem[] => {
  return Array.from({ length: count }, (_, idx) => {
    // 最初の1枠は必ずRare以上
    const options = idx === 0 ? { minRarity: 'rare' as const } : undefined;
    return generateRandomItem(`shop-${Date.now()}-${idx}`, options);
  });
};

// Shop items (より汎用的な定義)
export const shopItemsStore = atom<NodeItem[]>(generateRandomShopItems());

const initialPlayer: Entity = {
  hp: 120,
  atk: 20,
  bp: 1,
  atkType: undefined,
};

export const playerStore = map<Entity>({ ...initialPlayer });

export const enemyStore = map<Entity>({ ...baseEnemyStats });
export const enemySpriteStore = atom<string>(enemySpriteOptions[0]);
export const bossSpriteStore = atom<string>(enemySpriteOptions[0]);

const initialMainNodes: NodeItem[] = [
];

export const mainNodesStore = atom<NodeItem[]>(initialMainNodes);

// 初期アイテム（汎用的な定義）
const initialItems: NodeItem[] = [
  createItem('item-1', 'atk()', 'attack'),
  createItem('item-2', 'hp+=1', 'heal'),
  createItem('item-3', 'bp+=1', 'behavior'),
  createItem('item-4', 'enemyType=searchEnemyTypes()', 'element'),
  createItem('item-5', 'atk+=1', 'attack'),
];

export const itemNodesStore = atom<NodeItem[]>(initialItems);

export const logStore = atom<string[]>([]);

export const addLog = (msg: string) => {
  logStore.set([...logStore.get(), msg]);
};


// プレイ統計情報
export type GamePlayStats = {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHpHealed: number;
  totalBpConsumed: number;
  totalTurns: number;
  itemSwapCount: number;
  executionFailureCount: number;
  shopTradeCount: number;
};

const initialStats: GamePlayStats = {
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  totalHpHealed: 0,
  totalBpConsumed: 0,
  totalTurns: 0,
  itemSwapCount: 0,
  executionFailureCount: 0,
  shopTradeCount: 0,
};

export const gamePlayStatsStore = map<GamePlayStats>({ ...initialStats });

/**
 * 戦闘勝利時にランダムアイテムを2個獲得
 */
export const generateRewardItems = () => {
  const rewards = [
    generateRandomItem(`reward-${Date.now()}-1`),
  ];
  rewardItemsStore.set(rewards);
  showItemRewardModalStore.set(true);

  // バトル終了時に属性をリセット（報酬受け取りのタイミング）
  const player = playerStore.get();
  playerStore.set({ ...player, atkType: undefined });
};

/**
 * 固定報酬を生成する関数 (サイクルに応じて報酬変化)
 */
export const generateFixedRewardItems = () => {
  const cycle = cycleCountStore.get();
  let rewards: NodeItem[] = [];

  if (cycle === 1) {
    // 1周目: ランダム(Rare以上) x2 + atk+=1
    rewards = [
      generateRandomItem(`fixed-c1-1-${Date.now()}`),
      generateRandomItem(`fixed-c1-2-${Date.now()}`),
    ];
  } else if (cycle === 2) {
    rewards = [
      generateRandomItem(`fixed-c2-1-${Date.now()}`, { minRarity: 'rare' as const }),
      generateRandomItem(`fixed-c2-2-${Date.now()}`, { minRarity: 'rare' as const }),
    ];
  }

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

  // 統計情報をリセット
  gamePlayStatsStore.set({ ...initialStats });

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
