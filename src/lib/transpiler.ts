import { playerStore, enemyStore, addLog, generateRewardItems, gameResultStore, gameStateStore, itemNodesStore, battleCountStore, currentEventIndexStore, eventsStore, resetGameState, cycleCountStore } from '../store/game';
import type { NodeItem } from '../store/game';
import {
  findItemDefinitionByLabel,
  extractParametersFromLabel,
  type GameContext,
  type ValueType,
  type ElementType,
} from './itemDefinitions';

/**
 * NodeItemの配列からJavaScriptコードを生成する汎用トランスパイラ
 */
export const transpile = (nodes: NodeItem[]): string => {
  let code = "(async () => {\n";

  // 初期変数の宣言
  code += "  let n = 0;\n";
  code += "  let enemyType = undefined;\n";
  code += "  let atkType = undefined;\n";

  // 各ノードをコードに変換
  for (const node of nodes) {
    const itemDef = findItemDefinitionByLabel(node.label);

    if (itemDef) {
      // アイテム定義から動的にコード生成
      const params = extractParametersFromLabel(node.label);
      const generatedCode = itemDef.generateCode(params);
      code += `  ${generatedCode}\n`;
    } else {
      // フォールバック: node.codeをそのまま使用
      code += `  ${node.code}\n`;
    }
  }

  code += "})();";
  return code;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ゲームコードを実行する汎用実行エンジン
 */
export const executeGameLoop = async (nodes: NodeItem[]) => {
  addLog(`コード実行中...`);
  const { gamePlayStatsStore } = await import('../store/game');
  const startingPlayerBp = playerStore.get().bp; // ターン開始時のBPを保持
  const startingEnemyBp = enemyStore.get().bp;   // ターン開始時の敵BPを保持

  // ゲームコンテキストの構築
  const gameContext: GameContext = {
    player: { ...playerStore.get() },
    enemy: { ...enemyStore.get() },
    variables: {},
    log: addLog,
    sleep,
    updatePlayer: (updates) => {
      gameContext.player = { ...gameContext.player, ...updates };
      for (const [key, value] of Object.entries(updates)) {
        if (key in gameContext.player) {
          playerStore.setKey(key as keyof GameContext['player'], value);
        }
      }
    },
    updateEnemy: (updates) => {
      gameContext.enemy = { ...gameContext.enemy, ...updates };
      for (const [key, value] of Object.entries(updates)) {
        if (key in gameContext.enemy) {
          enemyStore.setKey(key as keyof GameContext['enemy'], value);
        }
      }
    },
  };

  const persistResult = async (status: 'GAME_OVER' | 'COMPLETED') => {
    try {
      const { recordGameResult } = await import('../server/controllers/postResult');
      const items = itemNodesStore.get();
      const stats = playerStore.get();
      const progress = {
        battleCount: battleCountStore.get(),
        currentEventIndex: currentEventIndexStore.get(),
        gameState: gameStateStore.get(),
        events: eventsStore.get(),
        cycleCount: cycleCountStore.get(),
      };
      const { gamePlayStatsStore } = await import('../store/game');
      const playLog = gamePlayStatsStore.get();
      const mapCycle = cycleCountStore.get();
      const mapEventIndex = currentEventIndexStore.get();
      const totalBattles = battleCountStore.get();
      await recordGameResult(battleCountStore.get(), nodes, items, stats, status, progress, {
        mapCycle,
        mapEventIndex,
        totalBattles,
        playLog,
      });
    } catch (e) {
      console.error('Failed to save result status', e);
    }
  };

  const runEnemyTurn = async () => {
    const enemy = enemyStore.get();
    const isBoss = gameStateStore.get() === 'BOSS';

    const { gamePlayStatsStore } = await import('../store/game');

    if (enemy.hp > 0) {
      addLog(`敵のターン！BP: ${enemy.bp}`);
      await sleep(500);

      const damage = enemy.atk * enemy.bp;
      addLog(`敵が${enemy.bp}回攻撃！合計ダメージ: ${damage}`);

      const currentPlayer = playerStore.get();
      const newHp = Math.max(0, currentPlayer.hp - damage);
      playerStore.setKey('hp', newHp);

      const stats = gamePlayStatsStore.get();
      gamePlayStatsStore.setKey('totalDamageTaken', stats.totalDamageTaken + damage);

      // HPが0になったらゲームオーバー
      if (newHp <= 0) {
        await sleep(500);
        addLog("HPが0になった...ゲームオーバー");
        await sleep(1000);
        gameResultStore.set('over');
        await persistResult('GAME_OVER');
        return;
      }
    } else {
      addLog("敵を倒した！");
      await sleep(500);

      // ボスを倒したらゲームクリア
      if (isBoss) {
        addLog("ボスを倒した！ゲームクリア！");
        await sleep(1000);
        gameResultStore.set('clear');
        await persistResult('COMPLETED');
        return;
      }

      // 通常の敵を倒した場合はアイテム獲得モーダルを表示
      generateRewardItems();
    }

    // ターン終了処理
    gamePlayStatsStore.setKey('totalTurns', gamePlayStatsStore.get().totalTurns + 1);

    await sleep(1000);
    addLog("ターン終了。BPをリセット。");
    playerStore.setKey('bp', startingPlayerBp);
    enemyStore.setKey('bp', startingEnemyBp);
  };

  // 事前バリデーション: enemyType未設定で条件分岐を使う、またはend不足
  const usesEnemyTypeCondition = nodes.some((n) => /^if enemyType=/.test(n.label));
  const hasEnemyTypeSearch = nodes.some((n) => n.label === 'enemyType=searchEnemyTypes()');
  if (usesEnemyTypeCondition && !hasEnemyTypeSearch) {
    addLog('エラー: enemyTypeが未定義です。先に enemyType=searchEnemyTypes() を実行してください。行動をスキップします。');
    const stats = gamePlayStatsStore.get();
    gamePlayStatsStore.setKey('executionFailureCount', stats.executionFailureCount + 1);
    await runEnemyTurn();
    return;
  }

  let controlDepth = 0;
  for (const node of nodes) {
    if (node.label.startsWith('if ')) controlDepth += 1;
    if (node.label === 'n.times do') controlDepth += 1;
    if (node.label === 'end') controlDepth -= 1;
    if (controlDepth < 0) break;
  }
  if (controlDepth !== 0) {
    addLog('エラー: if / n.times の対応が不足しています。コードを確認してください。行動をスキップします。');
    const stats = gamePlayStatsStore.get();
    gamePlayStatsStore.setKey('executionFailureCount', stats.executionFailureCount + 1);
    await runEnemyTurn();
    return;
  }

  const code = transpile(nodes);

  // 実行コンテキスト用の関数群を動的に生成
  type ContextFunction = (paramValue?: number | string) => Promise<void> | string | undefined;
  const contextFunctions: Record<string, ContextFunction> = {};

  // 各ノードの実行アクションを登録
  for (const node of nodes) {
    const itemDef = findItemDefinitionByLabel(node.label);
    if (itemDef?.executeAction) {
      const params = extractParametersFromLabel(node.label);

      // 関数名を抽出（例: "await atk()" → "atk"）
      const funcNameMatch = itemDef.generateCode(params).match(/(\w+)\s*\(/);
      if (funcNameMatch) {
        const funcName = funcNameMatch[1];

        // 既に登録されていなければ追加
        if (!contextFunctions[funcName]) {
          contextFunctions[funcName] = async (paramValue?: number | string) => {
            // パラメータ付きの場合は引数を使用、なければラベルから抽出
            let execParams: Record<string, ValueType | ElementType> | undefined;
            if (paramValue !== undefined) {
              if (typeof paramValue === 'number' && (paramValue === 1 || paramValue === 2 || paramValue === 3)) {
                execParams = { value: paramValue as ValueType };
              } else if (typeof paramValue === 'string' && (paramValue === 'water' || paramValue === 'fire' || paramValue === 'grass')) {
                execParams = { type: paramValue as ElementType };
              }
            } else {
              execParams = params;
            }
            await itemDef.executeAction!(gameContext, execParams);
          };
        }
      }
    }
  }

  // 基本関数の追加（既存のアイテムで定義されていない場合）
  if (!contextFunctions.atk) {
    const atkDef = findItemDefinitionByLabel('atk()');
    if (atkDef?.executeAction) {
      contextFunctions.atk = async () => {
        await atkDef.executeAction!(gameContext);
      };
    }
  }

  // searchEnemyTypes関数
  contextFunctions.searchEnemyTypes = () => {
    const type = gameContext.enemy.type;
    gameContext.variables.enemyType = type;
    return type;
  };

  try {
    // 安全な実行環境を構築
    const functionArgs = Object.keys(contextFunctions);
    const functionValues = Object.values(contextFunctions);

    const run = new Function(
      ...functionArgs,
      'atkType',
      'enemyType',
      `
      return ${code}
      `
    );

    await run(
      ...functionValues,
      gameContext.player.atkType,
      gameContext.variables.enemyType
    );
  } catch (e) {
    addLog(`エラー: ${e}`);
    console.error('Transpiler execution error:', e);
  }

  await runEnemyTurn();
};
