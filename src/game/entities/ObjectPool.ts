import Phaser from 'phaser';
import { Projectile } from './Projectile';

/**
 * 투사체 전용 Object Pool
 * update() 루프 내 new 생성을 방지하기 위해 미리 Projectile 객체를 생성해 둔다.
 * Phaser.GameObjects.Group의 getFirstDead / killAndHide를 활용한다.
 */
export class ObjectPool {
  private pool: Phaser.GameObjects.Group;

  /**
   * @param scene  - 소속 씬
   * @param size   - 사전 생성할 최대 객체 수 (기본 20)
   */
  constructor(scene: Phaser.Scene, size: number = 20) {
    // runChildUpdate: true → Phaser가 매 프레임 활성 객체의 update() 호출
    this.pool = scene.add.group({
      classType: Projectile,
      maxSize: size,
      runChildUpdate: true,
    });

    // 투사체 미리 생성 (Pool 워밍업) — 맵 외부 좌표에 비활성 상태로 배치
    this.pool.createMultiple({
      classType: Projectile,
      key: 'projectile_bullet',
      quantity: size,
      active: false,
      visible: false,
      setXY: { x: -100, y: -100 },
    });
  }

  /**
   * 비활성 투사체를 하나 꺼낸다.
   * 풀이 고갈됐으면 null 반환 (update 루프에서 null 체크 필수).
   */
  get(): Projectile | null {
    const obj = this.pool.getFirstDead(false) as Projectile | null;
    return obj ?? null;
  }

  /**
   * 사용 완료된 투사체를 풀로 반환한다.
   * setActive(false) + setVisible(false) 로 비활성화.
   */
  release(obj: Projectile): void {
    this.pool.killAndHide(obj);
    (obj.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
  }

  /**
   * 내부 Phaser.Group 직접 접근용 (충돌 감지 등에 활용)
   */
  getGroup(): Phaser.GameObjects.Group {
    return this.pool;
  }
}
