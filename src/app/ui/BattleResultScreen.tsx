import { Button } from '@/components/ui/button';
import { useBattleStore } from '@/app/store/battleStore';
import { usePlayerStore } from '@/app/store/playerStore';
import { EventBus } from '@/game/core/EventBus';
import type { BattleResult } from '@/types';

interface BattleResultScreenProps {
  result: BattleResult;
}

/**
 * 전투 결과 화면
 * 승패, 보상(자원/명성), 생존 유닛 수를 표시하고 로비로 돌아가는 버튼을 제공한다.
 */
export default function BattleResultScreen({ result }: BattleResultScreenProps) {
  const { endBattle } = useBattleStore();
  const { addFame, addResources } = usePlayerStore();

  const isWin = result.result === 'win';

  /** 보상 수령 후 로비로 복귀 */
  const handleReturnToLobby = () => {
    addResources(result.resourceReward);
    addFame(result.fameReward);
    endBattle(result);
    // Phaser 씬 정리 이벤트 (향후 씬 재시작에 활용)
    EventBus.emit('scene:ready', { sceneName: 'LoadingScene' });
  };

  // 경과 시간을 MM:SS로 변환
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        {/* 결과 타이틀 */}
        <div className={`text-4xl font-black mb-2 ${isWin ? 'text-yellow-400' : 'text-red-400'}`}>
          {isWin ? '승리!' : '패배'}
        </div>
        <div className="text-2xl mb-6">{isWin ? '🏆' : '💀'}</div>

        {/* 전투 통계 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">모드</span>
            <span className="text-white font-medium">
              {result.mode === 'attack' ? '공격전' : '방어전'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">경과 시간</span>
            <span className="text-white font-medium">{formatTime(result.timeElapsed)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">생존 유닛</span>
            <span className="text-white font-medium">{result.survivalCount}개</span>
          </div>
        </div>

        {/* 보상 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6 space-y-2">
          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">보상</div>
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-xl mb-0.5">🪙</div>
              <div className="text-yellow-300 font-bold">+{result.resourceReward}</div>
              <div className="text-gray-500 text-xs">자원</div>
            </div>
            <div className="text-center">
              <div className="text-xl mb-0.5">⭐</div>
              <div className="text-amber-300 font-bold">+{result.fameReward}</div>
              <div className="text-gray-500 text-xs">명성</div>
            </div>
          </div>
        </div>

        {/* 로비 복귀 버튼 */}
        <Button
          onClick={handleReturnToLobby}
          className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400"
        >
          로비로 돌아가기
        </Button>
      </div>
    </div>
  );
}
