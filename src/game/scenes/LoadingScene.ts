import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';

// 로딩 씬 — 에셋 프리로드 및 초기화 담당
// Task 3(scene-agent)에서 실제 에셋 로드 로직이 추가된다.
export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    // Task 3에서 에셋 로드 로직 추가
  }

  create(): void {
    // 로딩 완료 후 BattleScene으로 전환
    EventBus.emit('scene:ready', { sceneName: 'LoadingScene' });
    this.scene.start('BattleScene');
  }
}
