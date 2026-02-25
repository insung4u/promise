import type { SwipeDirection } from '@/types';

// 스와이프 명령 시스템 — React의 터치 입력을 Phaser 유닛 명령으로 변환
// Task 5(ai-agent)에서 실제 스와이프 처리 로직이 구현된다.

// 방향별 거점 이동 목표 좌표
// 세로형 맵(390×480) 기준 거점 좌표:
//   적 거점: (195, 80)  — 맵 상단 중앙
//   중립 거점: (195, 240) — 맵 중앙
//   아군 거점: (195, 400) — 맵 하단 중앙
const DIRECTION_TARGETS: Record<SwipeDirection, { x: number; y: number }> = {
  up:     { x: 195, y:  80 },   // 적 거점 방향 (맵 상단 중앙)
  down:   { x: 195, y: 400 },   // 아군 거점 방향 (맵 하단 중앙)
  left:   { x:  80, y: 240 },   // 좌 집결
  right:  { x: 310, y: 240 },   // 우 집결
  center: { x: 195, y: 240 },   // 중앙 거점
};

export class CommandSystem {
  // 스와이프 방향에 따른 목표 좌표 반환
  getTargetPosition(direction: SwipeDirection): { x: number; y: number } {
    return DIRECTION_TARGETS[direction];
  }

  // 스와이프 명령 처리 — Task 5에서 실제 유닛 이동 연결
  handleSwipe(direction: SwipeDirection): void {
    const target = this.getTargetPosition(direction);
    // Task 5에서 유닛 그룹에 이동 명령 전달
    console.log(`스와이프 명령: ${direction} → (${target.x}, ${target.y})`);
  }
}
