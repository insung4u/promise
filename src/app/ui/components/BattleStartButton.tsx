import { Button } from '@/components/ui/button';
import { EventBus } from '@/game/core/EventBus';
import { useBattleStore } from '@/app/store/battleStore';
import { usePlayerStore } from '@/app/store/playerStore';

/**
 * 전투 시작 버튼
 * 덱 유닛이 5개 미만이면 비활성화.
 * 클릭 시 useBattleStore.startBattle() 호출 + EventBus 이벤트 발행.
 */
export default function BattleStartButton() {
  const { player } = usePlayerStore();
  const { startBattle } = useBattleStore();

  const isReady = player.deck.length >= 5;

  const handleStart = () => {
    if (!isReady) return;

    const mode = 'attack';
    const timeLimit = 600; // 10분 기본

    // Zustand 상태 업데이트 (React 화면 전환 트리거)
    startBattle(mode, timeLimit);

    // Phaser BattleScene에 전투 시작 알림
    EventBus.emit('battle:start', {
      deck: player.deck,
      mode,
      timeLimit,
    });
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* 덱 현황 표시 */}
      <div className="text-xs text-gray-400">
        덱 편성: <span className={isReady ? 'text-green-400 font-bold' : 'text-orange-400 font-bold'}>
          {player.deck.length}/5
        </span>
        {!isReady && <span className="text-gray-500 ml-1">(유닛을 드래그해서 편성하세요)</span>}
      </div>

      {/* 전투 시작 버튼 */}
      <Button
        onClick={handleStart}
        disabled={!isReady}
        className={
          isReady
            ? 'w-full max-w-[280px] h-12 text-base font-bold bg-red-600 hover:bg-red-500 text-white border border-red-400 shadow-lg shadow-red-900/50 transition-all duration-200'
            : 'w-full max-w-[280px] h-12 text-base font-bold bg-gray-700 text-gray-500 border border-gray-600 cursor-not-allowed'
        }
      >
        {isReady ? '⚔️ 전투 시작' : '덱 편성 필요'}
      </Button>
    </div>
  );
}
