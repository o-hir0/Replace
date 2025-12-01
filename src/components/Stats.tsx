'use client';

import { useStore } from '@nanostores/react';
import { playerStore, enemyStore, gameStateStore } from '../store/game';

export default function Stats() {
  const player = useStore(playerStore);
  const enemy = useStore(enemyStore);
  const gameState = useStore(gameStateStore);
  const isBoss = gameState === 'BOSS';

  return (
    <div className="relative w-full h-full bg-[#385C85] text-white p-4">
      {/* Player Stats - Top Right */}
      <div className="absolute top-4 right-4 flex flex-col items-end">
        <h2 className="text-4xl font-bold mb-2 text-blue-300">player</h2>
        <div className="text-right text-xl font-mono">
          <div>ATK: {player.atk}</div>
          <div>HP: {player.hp}</div>
          <div>BP: {player.bp}</div>
        </div>
      </div>

      {/* Enemy Stats - Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none pb-0">
        <div className="flex flex-col items-center">
          <h2 className={`text-5xl font-bold mb-4 ${isBoss ? 'text-purple-300' : 'text-red-400'}`}>
            {isBoss ? 'boss' : 'enemy'}
          </h2>
          <div className="text-center text-xl font-mono mb-8">
            <div>ATK: {enemy.atk}</div>
            <div>HP: {enemy.hp}</div>
            <div>BP: {enemy.bp}</div>
          </div>
          
          {/* Enemy Visual */}
          <div className="animate-bounce-custom filter drop-shadow-lg translate-y-4">
            <img src="/asset/enemy/enemy-01.svg" alt="enemy" className="w-64 h-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
