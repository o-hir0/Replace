/**
 * アイテム定義システム
 * ゲーム内で使用できるコード片アイテムを汎用的に定義
 */

export type ItemCategory = '制御構文' | '攻撃' | '行動' | 'HP' | '敵属性';

export type ValueType = 1 | 2 | 3;
export type ElementType = 'water' | 'fire' | 'grass';

/**
 * アイテムのパラメータ定義
 */
export interface ItemParameter {
  name: string;
  type: 'value' | 'element';
  default?: ValueType | ElementType;
}

/**
 * アイテム定義
 */
export interface ItemDefinition {
  id: string;
  label: string; // ユーザーに表示される名前
  description: string; // アイテムの説明
  category: ItemCategory;
  multiSelect?: boolean; // パラメータを選択可能か
  parameters?: ItemParameter[];

  // コード生成関数
  generateCode: (params?: Record<string, ValueType | ElementType>) => string;

  // 実行時の処理を定義
  executeAction?: (
    context: GameContext,
    params?: Record<string, ValueType | ElementType>
  ) => Promise<void>;
}

/**
 * ゲーム変数の型
 */
export interface GameVariables {
  enemyType?: ElementType;
  n?: number;
  [key: string]: ElementType | number | undefined;
}

/**
 * ゲーム実行時のコンテキスト
 */
export interface GameContext {
  player: {
    hp: number;
    maxHp: number;
    atk: number;
    bp: number;
    maxBp: number;
    atkType?: ElementType;
  };
  enemy: {
    hp: number;
    maxHp: number;
    atk: number;
    bp: number;
    maxBp: number;
    type?: ElementType;
  };
  variables: GameVariables;
  log: (msg: string) => void;
  sleep: (ms: number) => Promise<void>;
  updatePlayer: (updates: Partial<GameContext['player']>) => void;
  updateEnemy: (updates: Partial<GameContext['enemy']>) => void;
}

/**
 * タイプ相性によるダメージ倍率を計算
 */
export const getTypeMultiplier = (atkType?: ElementType, defType?: ElementType): number => {
  if (!atkType || !defType) return 1.0;

  const typeChart: Record<ElementType, Record<ElementType, number>> = {
    water: { fire: 2.0, water: 1.0, grass: 0.5 },
    fire: { grass: 2.0, fire: 1.0, water: 0.5 },
    grass: { water: 2.0, grass: 1.0, fire: 0.5 },
  };

  return typeChart[atkType][defType];
};

/**
 * アイテム定義一覧
 */
export const itemDefinitions: Record<string, ItemDefinition> = {
  // n=X: 変数nを宣言する
  'n_assign': {
    id: 'n_assign',
    label: 'n=X',
    description: '変数nを宣言する。',
    category: '制御構文',
    multiSelect: true,
    parameters: [{ name: 'value', type: 'value', default: 1 }],
    generateCode: (params) => `n = ${params?.value ?? 1};`,
  },

  // n.times do: n回繰り返す
  'n_times_do': {
    id: 'n_times_do',
    label: 'n.times do',
    description: 'n回繰り返す。「end」と一緒に使う。',
    category: '制御構文',
    generateCode: () => 'for (let i = 0; i < n; i++) {',
  },

  // atk(): 攻撃する
  'atk_call': {
    id: 'atk_call',
    label: 'atk()',
    description: '攻撃するための「atk」関数を呼び出す。与えるダメージはプレイヤーの「atk」の値とタイプ相性によって決まる。',
    category: '攻撃',
    generateCode: () => 'await atk();',
    executeAction: async (context) => {
      // BP消費
      const bpCost = 1;
      const newBp = context.player.bp - bpCost;
      context.updatePlayer({ bp: newBp });

      if (newBp < 0) {
        const penalty = Math.abs(newBp);
        context.log(`BP不足！敵のBPが${penalty}増加`);
        context.updateEnemy({ bp: context.enemy.bp + penalty });
      }

      // ダメージ計算（タイプ相性考慮）
      const multiplier = getTypeMultiplier(context.player.atkType, context.enemy.type);
      const damage = Math.floor(context.player.atk * multiplier);

      if (multiplier > 1.0) {
        context.log(`効果は抜群だ！`);
      } else if (multiplier < 1.0) {
        context.log(`効果はいまひとつのようだ...`);
      }

      context.log(`プレイヤーの攻撃！${damage}ダメージ`);
      context.updateEnemy({ hp: Math.max(0, context.enemy.hp - damage) });

      await context.sleep(500);
    },
  },

  // atk+=X: 攻撃力増加
  'atk_increase': {
    id: 'atk_increase',
    label: 'atk+=X',
    description: 'プレイヤーの攻撃力を増加する。',
    category: '攻撃',
    multiSelect: true,
    parameters: [{ name: 'value', type: 'value', default: 1 }],
    generateCode: (params) => `atk_inc(${params?.value ?? 1});`,
    executeAction: async (context, params) => {
      const value = (params?.value as ValueType) ?? 1;
      const increase = value;
      const newAtk = context.player.atk + increase;
      context.updatePlayer({ atk: newAtk });
      context.log(`攻撃力が${increase}上昇！(ATK: ${newAtk})`);
      await context.sleep(200);
    },
  },

  // end: 制御構文を閉じる
  'end': {
    id: 'end',
    label: 'end',
    description: '条件分岐や繰り返しを閉じる。',
    category: '制御構文',
    generateCode: () => '}',
  },

  // bp+=X: BP増加
  'bp_increase': {
    id: 'bp_increase',
    label: 'bp+=X',
    description: '行動ポイントを増加する。',
    category: '行動',
    multiSelect: true,
    parameters: [{ name: 'value', type: 'value', default: 1 }],
    generateCode: (params) => `bp_inc(${params?.value ?? 1});`,
    executeAction: async (context, params) => {
      const value = (params?.value as ValueType) ?? 1;
      const newBp = context.player.bp + value;
      context.updatePlayer({ bp: newBp });
      context.log(`BP+${value} (BP: ${newBp})`);
      await context.sleep(200);
    },
  },

  // hp+=X: HP回復
  'hp_increase': {
    id: 'hp_increase',
    label: 'hp+=X',
    description: '自身のHPを増加する。つまり回復。',
    category: 'HP',
    multiSelect: true,
    parameters: [{ name: 'value', type: 'value', default: 1 }],
    generateCode: (params) => `heal(${params?.value ?? 1});`,
    executeAction: async (context, params) => {
      const value = (params?.value as ValueType) ?? 1;
      const healAmount = value;
      const newHp = Math.min(context.player.maxHp, context.player.hp + healAmount);
      context.updatePlayer({ hp: newHp });
      context.log(`HPが${healAmount}回復！(HP: ${newHp}/${context.player.maxHp})`);
      await context.sleep(200);
    },
  },

  // enemyType=searchEnemyTypes(): 敵の属性を確認
  'search_enemy_type': {
    id: 'search_enemy_type',
    label: 'enemyType=searchEnemyTypes()',
    description: '敵の属性を確認する「searchEnemyTypes」関数の結果をenemyTypeとする。',
    category: '敵属性',
    generateCode: () => 'enemyType = searchEnemyTypes();',
    executeAction: async (context) => {
      const type = context.enemy.type;
      context.variables.enemyType = type;
      const typeNames = { water: '水', fire: '炎', grass: '草' };
      context.log(`敵のタイプを確認: ${typeNames[type as ElementType] ?? '不明'}`);
      await context.sleep(200);
    },
  },

  // if enemyType=T: 敵属性に応じた条件分岐
  'if_enemy_type': {
    id: 'if_enemy_type',
    label: 'if enemyType=T',
    description: '敵属性に応じた条件分岐。',
    category: '制御構文',
    multiSelect: true,
    parameters: [{ name: 'type', type: 'element', default: 'water' }],
    generateCode: (params) => `if (enemyType === '${params?.type ?? 'water'}') {`,
  },

  // atkType=T: プレイヤーの攻撃タイプを宣言
  'atk_type_assign': {
    id: 'atk_type_assign',
    label: 'atkType=T',
    description: 'プレイヤーの攻撃タイプを宣言する。',
    category: '攻撃',
    multiSelect: true,
    parameters: [{ name: 'type', type: 'element', default: 'water' }],
    generateCode: (params) => `setAtkType('${params?.type ?? 'water'}');`,
    executeAction: async (context, params) => {
      const type = (params?.type as ElementType) ?? 'water';
      context.updatePlayer({ atkType: type });
      const typeNames = { water: '水', fire: '炎', grass: '草' };
      context.log(`攻撃タイプを${typeNames[type]}に設定`);
      await context.sleep(200);
    },
  },
};

/**
 * ラベルからアイテム定義を検索
 */
export const findItemDefinitionByLabel = (label: string): ItemDefinition | undefined => {
  console.log('findItemDefinitionByLabel: searching for', label);

  // 各定義とマッチングを試行
  for (const def of Object.values(itemDefinitions)) {
    // 完全一致チェック
    if (def.label === label) {
      console.log('  -> exact match found:', def.id);
      return def;
    }

    // パラメータ付きの場合（multiSelect: true）
    if (def.multiSelect) {
      // プレースホルダ T/X を具体値に置換した正規表現でマッチング
      // 正規表現特殊文字をエスケープ
      let pattern = def.label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      pattern = pattern.replace(/=T\b/g, '=(water|fire|grass)');
      pattern = pattern.replace(/=X\b/g, '=\\d+');
      const regex = new RegExp(`^${pattern}$`);
      console.log(`  -> testing pattern "${pattern}" against label "${label}":`, regex.test(label));
      if (regex.test(label)) {
        console.log('  -> pattern match found:', def.id);
        return def;
      }
    }
  }

  console.log('  -> no match found');
  return undefined;
};

/**
 * ラベルから説明を取得
 */
export const getItemDescription = (label: string): string => {
  const itemDef = findItemDefinitionByLabel(label);
  console.log('getItemDescription:', { label, found: !!itemDef, description: itemDef?.description });
  return itemDef?.description ?? 'このアイテムの説明はありません。';
};

/**
 * ラベルからパラメータを抽出
 */
export const extractParametersFromLabel = (label: string): Record<string, ValueType | ElementType> => {
  const params: Record<string, ValueType | ElementType> = {};

  // n=X
  const assignMatch = label.match(/^n=(\d+)$/);
  if (assignMatch) {
    params.value = parseInt(assignMatch[1]) as ValueType;
    return params;
  }

  // atk+=X, bp+=X, hp+=X
  const incrementMatch = label.match(/^(atk|bp|hp)\+=(\d+)$/);
  if (incrementMatch) {
    params.value = parseInt(incrementMatch[2]) as ValueType;
    return params;
  }

  // if enemyType=T
  const ifTypeMatch = label.match(/^if enemyType=(water|fire|grass)$/);
  if (ifTypeMatch) {
    params.type = ifTypeMatch[1] as ElementType;
    return params;
  }

  // atkType=T
  const atkTypeMatch = label.match(/^atkType=(water|fire|grass)$/);
  if (atkTypeMatch) {
    params.type = atkTypeMatch[1] as ElementType;
    return params;
  }

  return params;
};
