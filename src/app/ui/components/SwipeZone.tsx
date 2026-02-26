import { useEffect, useRef } from 'react';
import { EventBus } from '@/game/core/EventBus';

/**
 * 스와이프 명령 존
 *
 * 하단 터치 영역에서 스와이프 제스처를 감지하여
 * EventBus로 'battle:swipe' 이벤트를 발행한다.
 *
 * 방향 판정 기준:
 *   - 이동 거리 < 20px: 탭(center)
 *   - 가로 이동 > 세로 이동: 좌(left) 또는 우(right)
 *   - 세로 이동 >= 가로 이동: 위(up) 또는 아래(down)
 *
 * 이 컴포넌트는 React 레이어에서 터치를 처리하고
 * Phaser 씬에 직접 접근하지 않는다.
 * CommandSystem이 EventBus 이벤트를 수신하여 실제 유닛에 명령을 전달한다.
 */
export default function SwipeZone() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx    = e.changedTouches[0].clientX - startX;
      const dy    = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // 탭 (거의 움직이지 않음) → 중앙 집결
      if (absDx < 20 && absDy < 20) {
        EventBus.emit('battle:swipe', { direction: 'center' });
        return;
      }

      // 가로/세로 중 더 큰 방향으로 판정
      if (absDx > absDy) {
        EventBus.emit('battle:swipe', { direction: dx > 0 ? 'right' : 'left' });
      } else {
        // dy 양수 = 손가락이 아래로 이동 = 화면상 아래 = 후퇴(down)
        EventBus.emit('battle:swipe', { direction: dy > 0 ? 'down' : 'up' });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="
        w-full h-full
        flex flex-col items-center justify-center gap-3
        select-none touch-none
      "
    >
      {/* 방향 힌트 시각화 */}
      <div className="flex items-center justify-center gap-2 opacity-30">
        <span className="text-white text-lg">↑</span>
      </div>
      <div className="flex items-center justify-center gap-8 opacity-30">
        <span className="text-white text-lg">←</span>
        <div className="flex flex-col items-center">
          <span className="text-white/40 text-[10px] font-medium tracking-widest">SWIPE</span>
          <span className="text-white/20 text-[9px]">탭 = 집결</span>
        </div>
        <span className="text-white text-lg">→</span>
      </div>
      <div className="flex items-center justify-center gap-2 opacity-30">
        <span className="text-white text-lg">↓</span>
      </div>
    </div>
  );
}
