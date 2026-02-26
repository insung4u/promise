import { EventBus } from '../core/EventBus';
import { Unit } from '../entities/Unit';
import type { SwipeDirection } from '@/types';

/**
 * 스와이프 명령 시스템
 *
 * React SwipeZone 컴포넌트가 EventBus로 발행한 'battle:swipe' 이벤트를 수신하여
 * 플레이어 유닛 전체에 moveTo() 명령을 큐잉한다.
 *
 * 오토 모드(autoMode === true)일 때는 스와이프 입력을 무시한다.
 * 오토 ON/OFF 전환은 'battle:autoToggle' 이벤트로 처리한다.
 *
 * 세로형 맵(390×480) 기준 거점 좌표 사용:
 *   up:     (195,  80) — 적 거점 방향
 *   down:   (195, 400) — 아군 거점 방향
 *   left:   ( 80, 240) — 좌 집결
 *   right:  (310, 240) — 우 집결
 *   center: (195, 240) — 중앙 거점
 */
export class CommandSystem {
  /** 오토 모드 ON이면 스와이프 입력 무시 */
  private autoMode = true;

  /** 플레이어 유닛 배열을 가져오는 함수 (BattleScene에서 주입) */
  private readonly getPlayerUnits: () => Unit[];

  /**
   * 방향별 이동 목표 좌표
   * 세로형 맵(390×480) 거점 좌표 기반
   */
  private static readonly DIRECTION_TARGETS: Record<SwipeDirection, { x: number; y: number }> = {
    up:     { x: 195, y:  80 },   // 적 거점 방향 (맵 상단 중앙)
    down:   { x: 195, y: 400 },   // 아군 거점 방향 (맵 하단 중앙)
    left:   { x:  80, y: 240 },   // 좌 집결
    right:  { x: 310, y: 240 },   // 우 집결
    center: { x: 195, y: 240 },   // 중앙 거점
  };

  /**
   * @param getPlayerUnits - 현재 생존 플레이어 유닛 배열을 반환하는 함수
   *                         BattleScene에서 () => this.playerUnits 형태로 주입
   */
  constructor(getPlayerUnits: () => Unit[]) {
    this.getPlayerUnits = getPlayerUnits;
    this.registerListeners();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EventBus 리스너 등록
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * EventBus 이벤트 리스너를 등록한다.
   * destroy() 호출 시 반드시 해제해야 한다.
   */
  private registerListeners(): void {
    // 스와이프 명령 수신 — 오토 모드가 아닐 때만 처리
    EventBus.on('battle:swipe', ({ direction }) => {
      if (this.autoMode) return;
      this.handleSwipe(direction);
    });

    // 오토 모드 토글
    EventBus.on('battle:autoToggle', ({ auto }) => {
      this.autoMode = auto;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 퍼블릭 API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 현재 오토 모드 여부 반환
   */
  isAutoMode(): boolean {
    return this.autoMode;
  }

  /**
   * 외부에서 직접 스와이프 명령을 실행한다.
   * (테스트 또는 키보드 단축키 등에서 사용 가능)
   * 오토 모드와 무관하게 즉시 실행된다.
   */
  executeSwipe(direction: SwipeDirection): void {
    this.handleSwipe(direction);
  }

  /**
   * EventBus 리스너 해제 — BattleScene 종료/재시작 시 호출
   */
  destroy(): void {
    EventBus.off('battle:swipe');
    EventBus.off('battle:autoToggle');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 스와이프 방향에 따라 생존 유닛 전체에 moveTo 큐잉
   *
   * 유닛이 한 점에 겹치지 않도록 인덱스 기반 오프셋을 추가한다.
   * 3열 배치: (i % 3 - 1) * 35px 가로 오프셋, Math.floor(i/3) * 35px 세로 오프셋
   */
  private handleSwipe(direction: SwipeDirection): void {
    const units  = this.getPlayerUnits().filter((u) => u.isAlive);
    const target = CommandSystem.DIRECTION_TARGETS[direction];
    if (!target) return;

    units.forEach((unit, i) => {
      // 유닛 겹침 방지 오프셋 — 3열 그리드
      const offsetX = (i % 3 - 1) * 35;
      const offsetY = Math.floor(i / 3) * 35;
      unit.moveTo(target.x + offsetX, target.y + offsetY);
    });
  }
}
