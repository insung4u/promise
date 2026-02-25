import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';

// 전투 씬 — 핵심 게임플레이 씬
// Task 3(scene-agent)에서 거점, Object Pool, 맵 등이 추가된다.
// Task 4(unit-agent)에서 유닛 스폰 로직이 추가된다.
export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    // 씬 준비 완료 이벤트 발행 — React HUD가 이를 수신해 표시 시작
    EventBus.emit('scene:ready', { sceneName: 'BattleScene' });

    // 임시 텍스트 — Task 3에서 실제 맵으로 교체
    this.add.text(400, 300, '전투 씬 준비 중...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  update(_time: number, _delta: number): void {
    // Task 3~6에서 게임 루프 로직 추가
  }
}
