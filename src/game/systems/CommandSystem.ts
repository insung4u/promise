import type { SwipeDirection } from '@/types';

// 스와이프 명령 시스템 — React의 터치 입력을 Phaser 유닛 명령으로 변환
// Task 5(ai-agent)에서 실제 스와이프 처리 로직이 구현된다.

// 방향별 거점 이동 목표 좌표
// PRD 거점 좌표 기준: 좌상(100,100), 중앙(400,300), 우하(700,500)
const DIRECTION_TARGETS: Record<SwipeDirection, { x: number; y: number }> = {
  up:     { x: 400, y: 100 },
  down:   { x: 650, y: 500 },
  left:   { x: 150, y: 300 },
  right:  { x: 650, y: 300 },
  center: { x: 400, y: 300 },
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
