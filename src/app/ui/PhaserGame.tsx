import { useEffect, useRef } from 'react';
import { createGame } from '@/game/core/Game';
import type Phaser from 'phaser';

// Phaser Canvas를 React DOM에 마운트하는 컴포넌트.
// React StrictMode의 이중 실행을 방어하기 위해 gameRef 체크를 사용한다.
// React 파일에 Phaser 로직 작성 금지 — 이 컴포넌트는 마운트/언마운트만 처리.
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // 이미 생성된 게임이 있거나 컨테이너가 없으면 중복 생성 방지
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);

    return () => {
      // 컴포넌트 언마운트 시 Phaser 인스턴스 정리
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
