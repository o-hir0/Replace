import { playerStore, enemyStore, addLog } from '../store/game';
import type { NodeItem } from '../store/game';

export const transpile = (nodes: NodeItem[]): string => {
  let code = "(async () => {\n";
  code += "  let n = 0;\n"; // Default variable n
  
  for (const node of nodes) {
    code += `  ${node.code}\n`;
  }
  
  code += "})();";
  return code;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const executeGameLoop = async (nodes: NodeItem[]) => {
  const code = transpile(nodes);
  addLog(`Running code...`);
  
  // Define context functions
  const context = {
    atk: async () => {
      const player = playerStore.get();
      const enemy = enemyStore.get();
      
      // BP Check
      let currentBp = player.bp - 1;
      playerStore.setKey('bp', currentBp);
      
      if (currentBp < 0) {
        // Penalty logic: Add deficit to Enemy BP
        const penalty = Math.abs(currentBp);
        addLog(`BP Depleted! Enemy gains ${penalty} BP.`);
        enemyStore.setKey('bp', enemy.bp + penalty);
      }
      
      // Attack logic
      addLog(`Player attacks! ${player.atk} damage.`);
      enemyStore.setKey('hp', Math.max(0, enemy.hp - player.atk));
      
      await sleep(500); // Animation delay
    },
    atk_inc: async () => {
       const player = playerStore.get();
       playerStore.setKey('atk', player.atk + 5); // Arbitrary increase
       addLog(`Player ATK increased to ${player.atk + 5}`);
       await sleep(200);
    },
    heal: async () => {
       const player = playerStore.get();
       playerStore.setKey('hp', Math.min(player.maxHp, player.hp + 10));
       addLog(`Player healed. HP: ${Math.min(player.maxHp, player.hp + 10)}`);
       await sleep(200);
    },
    bp_inc: async () => {
       const player = playerStore.get();
       playerStore.setKey('bp', player.bp + 1);
       addLog(`Player BP +1`);
       await sleep(200);
    }
  };

  try {
    // Create a safe-ish execution environment
    // We use new Function but wrap it to inject our context
    const run = new Function('context', `
      const { atk, atk_inc, heal, bp_inc } = context;
      return ${code}
    `);
    
    await run(context);
  } catch (e) {
    addLog(`Error: ${e}`);
    // console.error(e); // Suppress console error to avoid Next.js overlay
  }
    
  // Enemy Turn Logic
  const enemy = enemyStore.get();
  if (enemy.hp > 0) {
      addLog(`Enemy Turn! BP: ${enemy.bp}`);
      await sleep(500);
      
      const damage = enemy.atk * enemy.bp;
      addLog(`Enemy attacks ${enemy.bp} times! Total Damage: ${damage}`);
      
      const currentPlayer = playerStore.get();
      playerStore.setKey('hp', Math.max(0, currentPlayer.hp - damage));
  } else {
      addLog("Enemy Defeated!");
  }

  // End of Turn Logic
  await sleep(1000);
  addLog("Turn End. Resetting BP.");
  playerStore.setKey('bp', playerStore.get().maxBp);
  enemyStore.setKey('bp', enemyStore.get().maxBp);
};
