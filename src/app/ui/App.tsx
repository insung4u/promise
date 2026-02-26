import { useEffect, useState } from 'react';
import { useBattleStore } from '@/app/store/battleStore';
import { EventBus } from '@/game/core/EventBus';
import PhaserGame from './PhaserGame';
import LobbyScreen from './LobbyScreen';
import BattleResultScreen from './BattleResultScreen';
import SwipeZone from './components/SwipeZone';
import type { BattleResult } from '@/types';

/**
 * 앱 최상위 컴포넌트
 * 화면 상태: 로비 → 전투 → 결과 → 로비 (순환)
 *
 * 레이아웃:
 *   - fixed inset-0: 모바일 Safari 주소창 대응
 *   - max-w-[430px]: iPhone 15 Pro 등 넓은 화면에서 중앙 고정
 *   - Phaser 캔버스: absolute z-0 (뒤쪽 풀스크린)
 *   - UI 오버레이: absolute z-10 (앞쪽 플로팅)
 */
export default function App() {
  const { isInBattle, lastResult, endBattle } = useBattleStore();

  /**
   * Phaser → React 방향: 전투 결과 이벤트 수신
   * BattleScene이 EventBus.emit('battle:result', ...) 발행 시 전투 종료 처리
   */
  useEffect(() => {
    const handleBattleResult = (result: BattleResult) => {
      endBattle(result);
    };

    EventBus.on('battle:result', handleBattleResult);
    return () => {
      EventBus.off('battle:result', handleBattleResult);
    };
  }, [endBattle]);

  return (
    // fixed inset-0: 물리적 화면 전체 꽉 채움 (모바일 Safari 주소창 대응)
    <div className="fixed inset-0 flex items-center justify-center w-full h-full bg-black">
      {/* 메인 컨테이너 — 오버레이 기준점 (max-w-[430px]로 넓은 화면 중앙 고정) */}
      <div className="relative w-full h-full max-w-[430px] mx-auto overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">

        {/* ─ Phaser 게임 캔버스 (z-0, 항상 렌더링) ─────────────────────── */}
        <div className="absolute inset-0 z-0">
          <PhaserGame />
        </div>

        {/* ─ 화면 전환 오버레이 (z-10) ─────────────────────────────────── */}
        {!isInBattle && !lastResult && (
          // 로비 화면: Phaser 위에 풀스크린 오버레이
          <div className="absolute inset-0 z-10 bg-gray-950/85">
            <LobbyScreen />
          </div>
        )}

        {isInBattle && (
          // 전투 화면: HUD 오버레이만 (Phaser 캔버스는 z-0으로 그대로 보임)
          <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
            {/* 상단 HUD — 타이머/점수 (React 오버레이) */}
            <BattleHUD />
            {/* 중앙 투명 영역 (Phaser 맵이 보임) */}
            <div className="flex-1 min-h-0" />
            {/* 하단 스킬 + 스와이프 존 (Task 6에서 구현) */}
            <BattleControls />
          </div>
        )}

        {!isInBattle && lastResult && (
          // 결과 화면
          <BattleResultScreen result={lastResult} />
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 전투 화면 내부 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 전투 HUD — 타이머와 생존 유닛 수 실시간 표시
 * BattleScene이 'battle:hud' 이벤트로 매 초 발행하는 데이터를 구독한다.
 */
function BattleHUD() {
  const [timeLeft, setTimeLeft] = useState(600);   // 10분 = 600초
  const [playerCount, setPlayerCount] = useState(0);
  const [enemyCount, setEnemyCount] = useState(0);

  useEffect(() => {
    /**
     * BattleScene에서 'battle:hud' 이벤트를 발행할 때 수신
     * { timeLeft: number, playerCount: number, enemyCount: number }
     */
    const handleHud = (data: { timeLeft: number; playerCount: number; enemyCount: number }) => {
      setTimeLeft(data.timeLeft);
      setPlayerCount(data.playerCount);
      setEnemyCount(data.enemyCount);
    };

    EventBus.on('battle:hud', handleHud);
    return () => {
      EventBus.off('battle:hud', handleHud);
    };
  }, []);

  // 초 → mm:ss 포맷
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div
      className="h-[60px] shrink-0 flex items-center justify-between px-4 pointer-events-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="bg-black/60 rounded-lg px-3 py-1 text-white text-sm font-mono backdrop-blur-sm">
        {mm}:{ss}
      </div>
      <div className="bg-black/60 rounded-lg px-3 py-1 text-white text-xs backdrop-blur-sm">
        아군: {playerCount} / 적: {enemyCount}
      </div>
    </div>
  );
}

/**
 * 전투 하단 컨트롤 — 스킬 버튼 + 오토 토글 + 스와이프 존
 *
 * 오토 버튼:
 *   - ON(기본): AutoAI가 자동으로 유닛을 조종. 스와이프 입력 무시.
 *   - OFF: 스와이프 명령만 수신. AutoAI 비활성화.
 *   EventBus.emit('battle:autoToggle', { auto }) 로 BattleScene에 전달.
 *
 * 스킬 버튼(Task 6에서 실제 로직 추가):
 *   현재는 배치만 완료. 클릭 시 EventBus.emit('battle:skill', { skill }) 발행 예정.
 */
function BattleControls() {
  /** 오토 모드 상태 — BattleScene CommandSystem과 동기화 */
  const [autoMode, setAutoMode] = useState(true);

  /** 오토 모드 토글 핸들러 */
  const handleAutoToggle = () => {
    const next = !autoMode;
    setAutoMode(next);
    EventBus.emit('battle:autoToggle', { auto: next });
  };

  /** 스킬 버튼 레이블 (Task 6에서 실제 핸들러 연결) */
  const skillButtons: { label: string; key: string }[] = [
    { label: '돌진', key: 'charge' },
    { label: '포격', key: 'barrage' },
    { label: '폭격', key: 'airstrike' },
    { label: '힐',   key: 'heal' },
  ];

  return (
    <div
      className="shrink-0 pointer-events-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* 스킬 버튼 + 오토 토글 영역 (~80px) */}
      <div className="h-[80px] flex items-center justify-center gap-3 bg-black/50 backdrop-blur-sm px-4 border-t border-gray-700/40">
        {skillButtons.map(({ label, key }) => (
          <button
            key={key}
            className="flex-1 h-12 rounded-lg bg-gray-800/80 border border-gray-600/60 text-white text-xs font-medium active:scale-95 transition-transform"
          >
            {label}
          </button>
        ))}
        {/* 오토 토글 버튼 — 활성화 시 강조 */}
        <button
          onClick={handleAutoToggle}
          className={[
            'flex-1 h-12 rounded-lg border text-xs font-medium active:scale-95 transition-all',
            autoMode
              ? 'bg-blue-600/80 border-blue-400/60 text-white'
              : 'bg-gray-800/80 border-gray-600/60 text-gray-400',
          ].join(' ')}
        >
          {autoMode ? '오토 ON' : '오토 OFF'}
        </button>
      </div>

      {/* 스와이프 명령 존 (~224px) — SwipeZone 컴포넌트로 실제 터치 처리 */}
      <div className="h-[224px] bg-gray-900/60 backdrop-blur-sm">
        <SwipeZone />
      </div>
    </div>
  );
}
