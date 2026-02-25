import Phaser from 'phaser';

// 투사체 클래스 — Object Pool에서 관리된다.
// Task 4(unit-agent)에서 실제 투사체 로직이 구현된다.
// update() 루프 내 new 생성 금지 — pool.get()으로만 획득.
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private damage: number = 0;
  private ownerId: string = '';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false);
    this.setVisible(false);
  }

  // Object Pool에서 꺼낼 때 초기화
  fire(x: number, y: number, targetX: number, targetY: number, damage: number, ownerId: string): void {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.damage = damage;
    this.ownerId = ownerId;

    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    const speed = 300;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
  }

  // Object Pool로 반환
  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  getDamage(): number { return this.damage; }
  getOwnerId(): string { return this.ownerId; }
}
