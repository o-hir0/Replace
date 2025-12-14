'use client';

import { useRouter } from 'next/navigation';

type GameResultModalProps = {
  result: 'clear' | 'over';
  onClose: () => void;
};

export default function GameResultModal({ result, onClose }: GameResultModalProps) {
  const router = useRouter();

  const handleReturnToMyPage = () => {
    onClose();
    // 次回の冒険を新規ゲームとして開始するため、クエリパラメータをクリア
    router.push('/mypage');
  };

  const isClear = result === 'clear';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 border-yellow-500">
        <h2 className={`text-4xl font-bold text-center mb-6 ${isClear ? 'text-yellow-400' : 'text-red-400'}`}>
          {isClear ? 'ゲームクリア！' : 'ゲームオーバー'}
        </h2>

        <div className="text-center mb-8">
          {isClear ? (
            <div className="space-y-4">
              <p className="text-2xl text-white">
                おめでとうございます！
              </p>
              <p className="text-xl text-gray-300">
                ボスを倒してゲームをクリアしました！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-2xl text-white">
                残念...
              </p>
              <p className="text-xl text-gray-300">
                HPが0になってしまいました
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleReturnToMyPage}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-lg shadow-lg transition-colors"
          >
            マイページに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
