import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { BattleScene } from '../scenes/BattleScene';

// Phaser 게임 인스턴스 생성 함수
// WebGL2 강제, Arcade Physics 사용
// PhaserGame.tsx의 useEffect에서 호출된다.
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
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
