import Phaser from 'phaser';

// Phaser 씬 전환 관리 클래스
// EventBus를 통해 React에서 씬 전환 요청을 받아 처리한다.
export class SceneManager {
  constructor(private game: Phaser.Game) {}

  // 씬 시작 (데이터 전달 옵션)
  start(sceneName: string, data?: Record<string, unknown>): void {
    this.game.scene.start(sceneName, data);
  }

  // 씬 정지
  stop(sceneName: string): void {
    this.game.scene.stop(sceneName);
  }

  // 씬 일시정지
  pause(sceneName: string): void {
    this.game.scene.pause(sceneName);
  }

  // 씬 재개
  resume(sceneName: string): void {
    this.game.scene.resume(sceneName);
  }
}
