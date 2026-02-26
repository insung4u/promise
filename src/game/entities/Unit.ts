import Phaser from 'phaser';
import type { UnitData } from '@/types';

/**
 * 전투 유닛 기반 클래스
 *
 * 모든 4종 유닛(보병/전차/공군/특수)의 공통 동작을 담당한다.
 *   - Arcade Physics 기반 이동 (목표 좌표 방향 벡터 이동)
 *   - 8방향 스프라이트 전환 (이동 각도 → 텍스처 키 + flipX)
 *   - HP 바 Graphics (값 변경 시에만 재드로우)
 *   - 근접/원거리 공격 (range > 1 이면 원거리)
 *   - takeDamage / die — Object Pool 패턴 준수 (destroy 직접 호출 금지)
 *
 * 성능 규칙:
 *   - preUpdate() 내 new 생성 금지 — _velocity 멤버 변수 재사용
 *   - HP 바 redraw는 hp 값이 바뀔 때만
 */
export class Unit extends Phaser.Physics.Arcade.Sprite {
  /** 유닛 원본 데이터 (스탯 등) */
  readonly unitData: UnitData;

  /** 팀 구분 — 'player' | 'enemy' */
  readonly team: 'player' | 'enemy';

  /** 이동 목표 좌표. null이면 정지 */
  private moveTarget: { x: number; y: number } | null = null;

  /** 공격 대상 유닛 */
  private attackTarget: Unit | null = null;

  /** 공격 쿨타임 누적 (ms) */
  private attackTimer = 0;

  /** 공격 간격 (ms) — 유닛 타입별 차등 */
  private readonly attackInterval: number;

  /** HP 바 배경 (회색 사각형) */
  private hpBarBg!: Phaser.GameObjects.Rectangle;

  /** HP 바 그래픽 (녹/황/적 변화) */
  private hpBar!: Phaser.GameObjects.Graphics;

  /** 현재 hp (redraw 비교용) */
  private lastHp: number;

  // preUpdate 내 new 방지 — 이동 벡터 멤버 변수로 재사용
  private readonly _vel = new Phaser.Math.Vector2();

  /** 현재 스프라이트 방향 키 (불필요한 setTexture 방지) */
  private currentDirKey = '';

  /** 사망 여부 */
  private _dead = false;

  /**
   * @param scene    - 소속 Phaser.Scene
   * @param x        - 초기 x 좌표
   * @param y        - 초기 y 좌표
   * @param unitData - 유닛 스탯 데이터
   * @param team     - 'player' 또는 'enemy'
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unitData: UnitData,
    team: 'player' | 'enemy',
  ) {
    // 초기 텍스처: <type>_E (동쪽 방향 placeholder)
    super(scene, x, y, `${unitData.type}_E`);
    this.unitData    = { ...unitData };
    this.team        = team;
    this.lastHp      = unitData.hp;
    this.currentDirKey = `${unitData.type}_E`;

    // 공격 간격: 사정거리가 길수록 느림 (원거리 밸런스)
    this.attackInterval = unitData.range > 1 ? 1800 : 1200;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 팀 색상 틴트 (적군: 붉은 계열 overlay)
    if (team === 'enemy') {
      this.setTint(0xff8888);
    }

    // 유닛 크기 (32×32 placeholder 기준)
    this.setDisplaySize(28, 28);

    // HP 바 생성
    this.buildHpBar();

    // idle 애니메이션 시작 (텍스처/애니메이션 존재 시만)
    this.playAnimSafe(`${unitData.type}_E_idle`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 퍼블릭 API — AutoAI / CommandSystem / SkillSystem에서 호출
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 이동 목표 설정
   * 호출 즉시 8방향 스프라이트 전환 + walk 애니메이션 재생.
   * preUpdate에서 목표까지 이동 후 자동 정지.
   */
  moveTo(x: number, y: number): void {
    if (this._dead) return;
    this.moveTarget = { x, y };

    // 8방향 스프라이트 전환 (이동 방향 기반)
    const deg = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, x, y),
    );
    const { key, flipX } = this.getDirSprite(deg);
    if (this.currentDirKey !== key) {
      this.currentDirKey = key;
      this.setTexture(key);
      this.playAnimSafe(`${key}_walk`);
    }
    this.setFlipX(flipX);
  }

  /**
   * 공격 대상 지정
   * AutoAI에서 가장 가까운 적을 찾아 이 메서드로 전달한다.
   * 실제 공격(데미지/투사체)은 preUpdate에서 attackInterval마다 발동.
   */
  setAttackTarget(target: Unit | null): void {
    this.attackTarget = target;
  }

  /**
   * 데미지 수신
   * 방어력의 10%를 피해 감소에 사용.
   * HP 0 이하가 되면 die() 호출.
   */
  takeDamage(amount: number): void {
    if (this._dead) return;
    const mitigated = Math.max(1, amount - this.unitData.defense * 0.1);
    this.unitData.hp = Math.max(0, this.unitData.hp - mitigated);

    // 값이 바뀐 경우에만 HP 바 재드로우
    if (this.unitData.hp !== this.lastHp) {
      this.lastHp = this.unitData.hp;
      this.redrawHpBar();
    }
    if (this.unitData.hp <= 0) this.die();
  }

  /**
   * HP 회복 (SkillSystem heal에서 사용)
   * maxHp 초과 불가.
   */
  heal(amount: number): void {
    if (this._dead) return;
    this.unitData.hp = Math.min(this.unitData.maxHp, this.unitData.hp + amount);
    if (this.unitData.hp !== this.lastHp) {
      this.lastHp = this.unitData.hp;
      this.redrawHpBar();
    }
  }

  /**
   * 속도 일시 변경 (SkillSystem 돌진에서 사용)
   * AutoAI/CommandSystem에서 이동 시 이 값이 반영된다.
   */
  setSpeed(speed: number): void {
    this.unitData.speed = speed;
  }

  /**
   * 사망 처리 — Object Pool 패턴 준수
   * destroy() 직접 호출 금지. setActive(false)/setVisible(false)로 비활성화.
   * BattleScene이 isAlive 체크 후 배열에서 제거한다.
   */
  die(): void {
    if (this._dead) return;
    this._dead = true;
    this.unitData.isAlive = false;

    // 물리 정지
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);

    // 사망 애니메이션 (있으면 재생, 없으면 즉시 비활성)
    const deathAnim = `${this.currentDirKey}_death`;
    if (this.scene?.anims.exists(deathAnim)) {
      this.playAnimSafe(deathAnim);
      // 애니메이션 완료 후 비활성화
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.deactivate();
      });
    } else {
      this.deactivate();
    }

    // HP 바 즉시 숨김
    this.hpBar.setVisible(false);
    this.hpBarBg.setVisible(false);
  }

  /** 사망 여부 조회 (BattleUnit 인터페이스 구현) */
  get isAlive(): boolean {
    return !this._dead;
  }

  /** 공격 사정거리 (픽셀) — range 수치 × 40px */
  get attackRangePx(): number {
    return this.unitData.range * 40;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phaser 생명주기
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 매 프레임 호출 (Phaser 내부)
   * - 이동 벡터 계산 (new 없이 _vel 재사용)
   * - 공격 쿨타임 처리
   * - HP 바 위치 동기화 (이동 중일 때만)
   */
  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this._dead) return;

    const body = this.body as Phaser.Physics.Arcade.Body | null;

    // ─ 이동 처리 ────────────────────────────────────────────────────────
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.x;
      const dy = this.moveTarget.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < 16) {
        // 목표 도달 — 정지 + idle 애니메이션
        this.moveTarget = null;
        body?.setVelocity(0, 0);
        this.playAnimSafe(`${this.currentDirKey}_idle`);
      } else {
        const dist = Math.sqrt(distSq);
        const spd  = this.unitData.speed;
        // _vel 재사용 (new 방지)
        this._vel.set(dx / dist * spd, dy / dist * spd);
        body?.setVelocity(this._vel.x, this._vel.y);
      }
    } else if (!this.attackTarget) {
      // 이동도, 공격도 없으면 정지
      body?.setVelocity(0, 0);
    }

    // ─ 공격 처리 ────────────────────────────────────────────────────────
    if (this.attackTarget) {
      if (!this.attackTarget.isAlive) {
        this.attackTarget = null;
      } else {
        this.attackTimer += delta;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;
          this.performAttack(this.attackTarget);
        }
      }
    }

    // ─ HP 바 위치 동기화 ─────────────────────────────────────────────────
    // 이동 중이거나 초기 배치 시 HP 바 위치를 갱신한다
    this.syncHpBarPosition();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * HP 바 생성 (유닛당 1회)
   * 배경(어두운 사각형) + 현재 HP(색상 변화 사각형) 2-레이어 구조.
   */
  private buildHpBar(): void {
    const W  = 28;
    const H  = 4;
    const OY = -20;  // 유닛 머리 위 20px

    this.hpBarBg = this.scene.add.rectangle(
      this.x,
      this.y + OY,
      W, H,
      0x333333,
    ).setDepth(20).setOrigin(0.5, 0.5);

    this.hpBar = this.scene.add.graphics().setDepth(21);
    this.redrawHpBar();
  }

  /**
   * HP 바 색상 + 너비 재드로우
   * HP 비율 > 50%: 녹색 / 25~50%: 황색 / < 25%: 빨강
   * 이 메서드는 hp 값이 변경될 때만 호출한다 (성능 규칙).
   */
  private redrawHpBar(): void {
    const W   = 28;
    const H   = 4;
    const OY  = -20;
    const ratio = this.unitData.hp / this.unitData.maxHp;
    const color = ratio > 0.5 ? 0x44ff44
                : ratio > 0.25 ? 0xffff00
                : 0xff4444;

    this.hpBar.clear();
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(
      this.x - W / 2,
      this.y + OY - H / 2,
      W * ratio,
      H,
    );
  }

  /**
   * HP 바를 유닛 현재 위치에 동기화한다.
   * preUpdate에서 이동 중일 때 매 프레임 호출된다.
   */
  private syncHpBarPosition(): void {
    const OY = -20;
    const W  = 28;
    const H  = 4;

    this.hpBarBg.setPosition(this.x, this.y + OY);

    // hp bar의 좌상단 기준 위치만 이동 (clear 없이)
    this.hpBar.clear();
    const ratio = this.unitData.hp / this.unitData.maxHp;
    const color = ratio > 0.5 ? 0x44ff44
                : ratio > 0.25 ? 0xffff00
                : 0xff4444;
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(
      this.x - W / 2,
      this.y + OY - H / 2,
      W * ratio,
      H,
    );
  }

  /**
   * 비활성화 (Object Pool 반환 직전 상태)
   * BattleScene이 isAlive === false 인 유닛을 배열에서 제거한다.
   */
  private deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.hpBar.setVisible(false);
    this.hpBarBg.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  /**
   * 이동 각도(도)에 따른 스프라이트 키와 flipX 반환
   * 8방향 중 5방향 파일(E/NE/N/SE/S) + 3방향 flipX로 처리.
   *
   * 각도 기준 (Phaser Angle.Between 반환값: -180~180):
   *   E    :  -22.5 ~ +22.5
   *   NE   :  +22.5 ~ +67.5  (위쪽이 음수인 Phaser 좌표계 주의)
   *   N    :  +67.5 ~ +112.5
   *   NW   : +112.5 ~ +157.5  → NE + flipX
   *   W    : ±157.5 ~ ±180   → E  + flipX
   *   SW   :  -157.5 ~ -112.5 → SE + flipX
   *   S    :  -112.5 ~ -67.5
   *   SE   :  -67.5 ~ -22.5
   *
   * Phaser 좌표계는 Y축 아래 방향이 양수이므로,
   * Angle.Between(x1,y1, x2,y2) 에서 위쪽(y 감소)이 음수 각도이다.
   * 따라서 화면상 '북(위)'은 각도 -90도 근방.
   * 아래 분기는 화면 기준으로 작성됨.
   */
  private getDirSprite(deg: number): { key: string; flipX: boolean } {
    const t = this.unitData.type;

    // 동 (E)
    if (deg > -22.5 && deg <= 22.5)   return { key: `${t}_E`,  flipX: false };
    // 남동 (SE) — 화면 기준 아래오른쪽
    if (deg > -67.5 && deg <= -22.5)  return { key: `${t}_SE`, flipX: false };
    // 남 (S) — 화면 기준 아래
    if (deg > -112.5 && deg <= -67.5) return { key: `${t}_S`,  flipX: false };
    // 남서 (SW) — SE + flipX
    if (deg > -157.5 && deg <= -112.5) return { key: `${t}_SE`, flipX: true };
    // 북동 (NE) — 화면 기준 위오른쪽
    if (deg > 22.5 && deg <= 67.5)    return { key: `${t}_NE`, flipX: false };
    // 북 (N) — 화면 기준 위
    if (deg > 67.5 && deg <= 112.5)   return { key: `${t}_N`,  flipX: false };
    // 북서 (NW) — NE + flipX
    if (deg > 112.5 && deg <= 157.5)  return { key: `${t}_NE`, flipX: true };
    // 서 (W) — E + flipX
    return { key: `${t}_E`, flipX: true };
  }

  /**
   * 애니메이션을 안전하게 재생한다.
   * 등록되지 않은 애니메이션 키는 무시 (오류 없이 스킵).
   */
  private playAnimSafe(animKey: string): void {
    if (this.scene?.anims.exists(animKey) && this.anims.currentAnim?.key !== animKey) {
      this.play(animKey);
    }
  }

  /**
   * 실제 공격 실행
   * - 근접(range ≤ 1): 대상 유닛에 직접 takeDamage 호출
   * - 원거리(range > 1): SkillSystem/AutoAI 에서 투사체 발사 처리
   *   (Unit 자신은 attackTarget에게 직접 데미지, 투사체는 시각 효과용)
   */
  private performAttack(target: Unit): void {
    // 공격 애니메이션 재생
    this.playAnimSafe(`${this.currentDirKey}_attack`);

    // 거리 체크 — 사정거리 이내인 경우에만 데미지
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (dist <= this.attackRangePx) {
      target.takeDamage(this.unitData.attack);
    }
  }
}
