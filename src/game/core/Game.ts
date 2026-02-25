import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { BattleScene } from '../scenes/BattleScene';

// Phaser 게임 인스턴스 생성 함수
// 모바일 세로형(Portrait)만 지원. 해상도: 390×480 (Phaser 맵 영역)
// 전체 앱 해상도 390×844 중 HUD·스킬버튼·스와이프존을 제외한 맵 영역만 담당.
// PhaserGame.tsx의 useEffect에서 호출된다.
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: 390,
    height: 480,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [LoadingScene, BattleScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });
}
