import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { BattleScene } from '../scenes/BattleScene';

// Phaser 게임 인스턴스 생성 함수
// 모바일 세로형(Portrait)만 지원. 해상도: 100% (디바이스 전체 뷰포트를 채움)
// 전체 앱 해상도 100dvh 중 HUD·스킬버튼 인터페이스는 PhaserCanvas 위에 Absolute 오버레이로 덮어서 렌더링.
// PhaserGame.tsx의 useEffect에서 호출된다.
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: '100%',
    height: '100%',
    parent,
    backgroundColor: '#7cb342', // 클래시로얄 풍 잔디색 임시 배경
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [LoadingScene, BattleScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
