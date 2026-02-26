import { useEffect, useState } from 'react';
import { useBattleStore } from '@/app/store/battleStore';
import { EventBus } from '@/game/core/EventBus';
import PhaserGame from './PhaserGame';
import LobbyScreen from './LobbyScreen';
import BattleResultScreen from './BattleResultScreen';
import SwipeZone from './components/SwipeZone';
import type { BattleResult, SkillType } from '@/types';

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

        {isInBattle && <BattleView />}

        {!isInBattle && lastResult && (
          // 결과 화면
          <BattleResultScreen result={lastResult} />
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 전투 화면 통합 뷰 — HUD 상태를 여기서 통합 관리하여 자식에게 전달
// ─────────────────────────────────────────────────────────────────────────────

/** battle:hud 이벤트 페이로드 타입 (GameEvents에서 참조) */
interface HudData {
  timeLeft: number;
  playerCount: number;
  enemyCount: number;
  skillCooldownRatios: [number, number, number, number];
}

/**
 * 전투 뷰 — 전투 중 화면 오버레이 컨테이너
 * 'battle:hud' 이벤트를 구독하여 HUD 데이터를 자식 컴포넌트에 전달한다.
 * 상태를 여기서 통합 관리하면 BattleHUD와 BattleControls가 동일 데이터를 공유한다.
 */
function BattleView() {
  const [hudData, setHudData] = useState<HudData>({
    timeLeft: 600,
    playerCount: 0,
    enemyCount: 0,
    skillCooldownRatios: [0, 0, 0, 0],
  });

  useEffect(() => {
    /** BattleScene이 매 초 발행하는 HUD 데이터 구독 */
    const handleHud = (data: HudData) => setHudData(data);
    EventBus.on('battle:hud', handleHud);
    return () => { EventBus.off('battle:hud', handleHud); };
  }, []);

  return (
    // 전투 화면: HUD 오버레이만 (Phaser 캔버스는 z-0으로 그대로 보임)
    <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
      {/* 상단 HUD — 타이머/유닛 수 */}
      <BattleHUD
        timeLeft={hudData.timeLeft}
        playerCount={hudData.playerCount}
        enemyCount={hudData.enemyCount}
      />
      {/* 중앙 투명 영역 (Phaser 맵이 보임) */}
      <div className="flex-1 min-h-0" />
      {/* 하단 스킬 버튼 + 스와이프 존 */}
      <BattleControls cooldownRatios={hudData.skillCooldownRatios} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 전투 화면 내부 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

interface BattleHUDProps {
  timeLeft: number;
  playerCount: number;
  enemyCount: number;
}

/**
 * 전투 HUD — 타이머와 생존 유닛 수 표시
 * BattleView에서 battle:hud 이벤트를 구독하고 props로 전달한다.
 */
function BattleHUD({ timeLeft, playerCount, enemyCount }: BattleHUDProps) {
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

interface BattleControlsProps {
  /** 스킬 쿨타임 비율 배열 [charge, barrage, airstrike, heal] (0=사용 가능, 1=방금 사용) */
  cooldownRatios: [number, number, number, number];
}

/**
 * 전투 하단 컨트롤 — 스킬 버튼 + 오토 토글 + 스와이프 존
 *
 * 스킬 버튼:
 *   - 클릭 시 EventBus.emit('battle:skill', { unitId: '', skillIndex })
 *   - skillIndex는 덱 내 유닛 인덱스 (0=보병계/1=전차계/2=공군계/3=특수계)
 *   - cooldownRatios[i] > 0 이면 쿨타임 오버레이 표시
 *
 * 오토 버튼:
 *   - ON(기본): AutoAI 자동 조종. 스와이프 입력 무시.
 *   - OFF: 스와이프 명령 수신. CommandSystem이 처리.
 */
function BattleControls({ cooldownRatios }: BattleControlsProps) {
  /** 오토 모드 상태 — BattleScene CommandSystem과 동기화 */
  const [autoMode, setAutoMode] = useState(true);

  /** 오토 모드 토글 핸들러 */
  const handleAutoToggle = () => {
    const next = !autoMode;
    setAutoMode(next);
    EventBus.emit('battle:autoToggle', { auto: next });
  };

  /**
   * 스킬 버튼 정의
   * index는 덱 내 유닛 인덱스와 대응한다 (SkillSystem이 skillIndex 기반 조회).
   * unitId는 EventBus 타입 요구사항을 위해 빈 문자열 전달 (SkillSystem은 index만 사용).
   */
  const skillButtons: { label: string; skill: SkillType; index: number }[] = [
    { label: '돌진', skill: 'charge',    index: 0 },
    { label: '포격', skill: 'barrage',   index: 1 },
    { label: '폭격', skill: 'airstrike', index: 2 },
    { label: '힐',   skill: 'heal',      index: 3 },
  ];

  return (
    <div
      className="shrink-0 pointer-events-auto"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* 스킬 버튼 + 오토 토글 영역 (~80px) */}
      <div className="h-[80px] flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm px-3 border-t border-gray-700/40">
        {skillButtons.map(({ label, skill, index }) => {
          const ratio     = cooldownRatios[index] ?? 0;
          const isReady   = ratio <= 0;
          const cooldownH = `${Math.round(ratio * 100)}%`;

          return (
            // 스킬 버튼 — 쿨타임 오버레이 포함 (relative 컨테이너)
            <button
              key={skill}
              onClick={() => EventBus.emit('battle:skill', { unitId: '', skillIndex: index })}
              disabled={!isReady}
              className={[
                'relative flex-1 h-12 rounded-lg border text-white text-xs font-medium',
                'overflow-hidden transition-all active:scale-95',
                isReady
                  ? 'bg-gray-700/80 border-gray-500/60'
                  : 'bg-gray-900/80 border-gray-700/40 cursor-not-allowed',
              ].join(' ')}
            >
              {/* 쿨타임 채우기 오버레이 — 아래에서 위로 비워짐 */}
              {!isReady && (
                <span
                  className="absolute bottom-0 left-0 w-full bg-gray-600/50 transition-all duration-1000"
                  style={{ height: cooldownH }}
                />
              )}
              {/* 버튼 레이블 */}
              <span className="relative z-10 flex flex-col items-center leading-tight">
                <span>{label}</span>
                {!isReady && (
                  <span className="text-[9px] text-gray-400 mt-0.5">
                    {/* 쿨타임 퍼센트 표시 */}
                    {Math.ceil(ratio * getCooldownMs(skill) / 1000)}s
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* 오토 토글 버튼 */}
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

      {/* 스와이프 명령 존 (~224px) */}
      <div className="h-[224px] bg-gray-900/60 backdrop-blur-sm">
        <SwipeZone />
      </div>
    </div>
  );
}

/**
 * 스킬 타입별 최대 쿨타임(ms) 반환 헬퍼
 * BattleControls에서 남은 쿨타임 초 표시에 사용.
 * SkillSystem의 COOLDOWNS_MS와 동기화 필수.
 */
function getCooldownMs(skill: SkillType): number {
  const map: Record<SkillType, number> = {
    charge:     8000,
    barrage:   12000,
    airstrike: 15000,
    heal:      10000,
  };
  return map[skill];
}
