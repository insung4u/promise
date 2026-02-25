import Phaser from 'phaser';
import type { UnitData } from '@/types';

// 유닛 기본 클래스 — Phaser.Physics.Arcade.Sprite 상속
// Task 4(unit-agent)에서 4종 유닛 구현으로 확장된다.
// update() 루프 내 new 객체 생성 금지 — Object Pool 패턴 준수.
export class Unit extends Phaser.Physics.Arcade.Sprite {
  protected unitData: UnitData;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, unitData: UnitData) {
    super(scene, x, y, texture);
    this.unitData = unitData;
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  // 유닛 업데이트 — 매 프레임 호출
  update(_time: number, _delta: number): void {
    // Task 4에서 AI 이동, 공격 로직 추가
  }

  // 데미지 처리 — Object Pool 패턴 준수
  // destroy() 직접 호출 금지. 비활성화 후 Pool 반환 대기.
  // Task 4에서 BattleScene의 Pool이 setActive(false) 상태를 감지해 회수한다.
  takeDamage(amount: number): void {
    this.unitData.hp = Math.max(0, this.unitData.hp - amount);
    if (this.unitData.hp <= 0) {
      this.unitData.isAlive = false;
      this.setActive(false);
      this.setVisible(false);
    }
  }

  getData(): UnitData {
    return this.unitData;
  }
}
