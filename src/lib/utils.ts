import type { DirectionKey } from '@/types';

// 두 좌표 사이의 방향 키와 flipX 여부를 반환하는 유틸 함수
// 8방향 스프라이트 텍스처 키 계산에 사용된다.
// 텍스처 키 형식: `${unitType}_${directionKey}` (예: infantry_E)
//
// placeholder 단계:
//   항상 _E suffix 반환 (동쪽 방향 단일 스프라이트)
//   향후 8방향 분기로 교체 시 이 함수만 수정하면 된다.
export function getDirectionKey(
  _fromX: number,
  _fromY: number,
  _toX: number,
  _toY: number
): { key: DirectionKey; flipX: boolean } {
  // TODO: Task 4에서 실제 8방향 분기 로직으로 교체
  // 현재는 placeholder 단계 — 항상 E(동) 방향 반환
  return { key: 'E', flipX: false };
}

// 두 점 사이의 거리 계산
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// 숫자를 주어진 범위 내로 제한
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// 밀리초를 "MM:SS" 형식 문자열로 변환
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
