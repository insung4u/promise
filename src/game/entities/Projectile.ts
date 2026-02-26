import Phaser from 'phaser';

/**
 * 투사체 클래스 — 원거리 유닛(공군/특수) 공격 시 사용
 *
 * ObjectPool에서 꺼내 재사용하므로 직접 new 생성 금지.
 * Phaser.Physics.Arcade.Sprite를 상속하여 Pool의 getFirstDead / killAndHide와 호환된다.
 *
 * 사용 흐름:
 *   1. ObjectPool.get() → Projectile 인스턴스 획득
 *   2. projectile.fire(...)  → 활성화 + 방향 설정
 *   3. preUpdate()에서 목표 방향으로 이동
 *   4. 목표 도달 또는 맵 밖 이탈 시 ObjectPool.release() 호출
 *
 * 성능 규칙:
 *   - preUpdate() 내 new 생성 금지 — _vel 멤버 변수 재사용
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  /** 투사체 데미지 */
  private _damage = 0;

  /** 발사한 유닛 id (충돌 판정 시 아군 피격 방지용) */
  private _ownerId = '';

  /** 목표 x 좌표 */
  private _targetX = 0;

  /** 목표 y 좌표 */
  private _targetY = 0;

  /** 이동 속도 (px/s) */
  private readonly _speed = 320;

  // preUpdate 내 new 방지 — 이동 벡터 재사용
  private readonly _vel = new Phaser.Math.Vector2();

  /**
   * Phaser Group.createMultiple 에서 호출되는 생성자.
   * 비활성 상태로 시작한다.
   */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile_bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setActive(false).setVisible(false);
    this.setDisplaySize(8, 8);
  }

  /**
   * 투사체 발사 초기화
   * ObjectPool에서 꺼낸 후 이 메서드로 활성화한다.
   *
   * @param x        - 발사 x 좌표
   * @param y        - 발사 y 좌표
   * @param targetX  - 목표 x 좌표
   * @param targetY  - 목표 y 좌표
   * @param damage   - 데미지 값
   * @param ownerId  - 발사한 유닛 id
   */
  fire(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    damage: number,
    ownerId: string,
  ): void {
    this.setPosition(x, y).setActive(true).setVisible(true);
    this._damage   = damage;
    this._ownerId  = ownerId;
    this._targetX  = targetX;
    this._targetY  = targetY;
  }

  /**
   * 투사체를 풀로 반환한다.
   * 충돌 감지 또는 목표 도달 시 호출.
   */
  deactivate(): void {
    this.setActive(false).setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  /**
   * 매 프레임: 목표 방향으로 이동
   * 목표 반경 12px 이내 도달 시 자동 비활성화.
   */
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;

    const dx   = this._targetX - this.x;
    const dy   = this._targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) {
      // 목표 도달 — 비활성화 (충돌 처리는 BattleScene/AutoAI에서)
      this.deactivate();
      return;
    }

    // 이동 벡터 재사용 (new 방지)
    const s = this._speed * (delta / 1000);
    this._vel.set(dx / dist * s, dy / dist * s);
    this.x += this._vel.x;
    this.y += this._vel.y;

    // 맵 밖 이탈 시 자동 반환 (390×480 맵 기준 + 여유 50px)
    if (this.x < -50 || this.x > 440 || this.y < -50 || this.y > 530) {
      this.deactivate();
    }
  }

  // ─── 읽기 전용 접근자 ───────────────────────────────────────────────────

  /** 투사체 데미지 */
  get damage(): number { return this._damage; }

  /** 발사한 유닛 id */
  get ownerId(): string { return this._ownerId; }

  // 하위 호환성 유지 (기존 코드에서 getDamage(), getOwnerId() 사용 시)
  getDamage(): number  { return this._damage; }
  getOwnerId(): string { return this._ownerId; }
}
