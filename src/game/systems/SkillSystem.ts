import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { EventBus } from '../core/EventBus';
import type { SkillType } from '@/types';

/**
 * 스킬 시스템
 *
 * 4종 스킬의 효과 발동, 쿨타임 관리를 담당한다.
 * EventBus의 'battle:skill' 이벤트를 수신하여 덱 인덱스 기반으로 스킬을 발동한다.
 *
 * 스킬-유닛 타입 매핑:
 *   인덱스 0 / infantry → charge   (돌진)
 *   인덱스 1 / tank     → barrage  (포격)
 *   인덱스 2 / air      → airstrike (폭격)
 *   인덱스 3 / special  → heal     (힐)
 *
 * 쿨타임은 스킬 타입별로 독립 관리하며,
 * 매 프레임 BattleScene.update()에서 update(delta)를 호출해야 한다.
 */
export class SkillSystem {
  /** 스킬 타입별 쿨타임 (ms) */
  private readonly COOLDOWNS_MS: Record<SkillType, number> = {
    charge:     8000,
    barrage:   12000,
    airstrike: 15000,
    heal:      10000,
  };

  /** 스킬 타입별 남은 쿨타임 (ms) — Map 재사용, update() 내 new 없음 */
  private readonly cooldowns = new Map<SkillType, number>([
    ['charge',     0],
    ['barrage',    0],
    ['airstrike',  0],
    ['heal',       0],
  ]);

  /**
   * @param scene          - 소속 Phaser.Scene (delayedCall, 시각 효과용)
   * @param getPlayerUnits - 현재 생존 아군 유닛 배열 접근자
   * @param getEnemyUnits  - 현재 생존 적 유닛 배열 접근자
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getPlayerUnits: () => Unit[],
    private readonly getEnemyUnits:  () => Unit[],
  ) {
    this.registerListeners();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 퍼블릭 API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 매 프레임 BattleScene.update()에서 호출
   * 스킬 쿨타임을 delta만큼 감소한다.
   */
  update(delta: number): void {
    for (const [skill, cd] of this.cooldowns) {
      if (cd > 0) {
        this.cooldowns.set(skill, Math.max(0, cd - delta));
      }
    }
  }

  /**
   * 스킬 타입별 쿨타임 비율 반환 (0.0 = 사용 가능, 1.0 = 방금 사용)
   * HUD 쿨타임 오버레이 표시에 사용한다.
   */
  getCooldownRatio(skill: SkillType): number {
    const remaining = this.cooldowns.get(skill) ?? 0;
    return remaining / this.COOLDOWNS_MS[skill];
  }

  /**
   * 스킬 4종의 쿨타임 비율을 순서대로 반환 [charge, barrage, airstrike, heal]
   * BattleScene → battle:hud 이벤트에 포함하여 React HUD에 전달한다.
   */
  getCooldownRatios(): [number, number, number, number] {
    return [
      this.getCooldownRatio('charge'),
      this.getCooldownRatio('barrage'),
      this.getCooldownRatio('airstrike'),
      this.getCooldownRatio('heal'),
    ];
  }

  /**
   * EventBus 리스너 해제 — BattleScene 종료 시 호출
   */
  destroy(): void {
    EventBus.off('battle:skill');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 'battle:skill' 이벤트 리스너 등록
   * skillIndex: 덱 내 유닛 인덱스 (0~4)
   * 유닛 타입에 따라 대응 스킬이 결정된다.
   */
  private registerListeners(): void {
    EventBus.on('battle:skill', ({ skillIndex }) => {
      const units = this.getPlayerUnits();
      const unit  = units[skillIndex];
      if (!unit || !unit.isAlive) return;
      this.activate(unit);
    });
  }

  /**
   * 스킬 발동
   * 쿨타임 중이면 무시하고, 쿨타임이 소진된 경우에만 발동한다.
   */
  private activate(unit: Unit): void {
    const skill = this.getSkillType(unit.unitData.type);
    const cd    = this.cooldowns.get(skill) ?? 0;
    if (cd > 0) return;  // 쿨타임 중

    this.cooldowns.set(skill, this.COOLDOWNS_MS[skill]);

    switch (skill) {
      case 'charge':    this.doCharge();          break;
      case 'barrage':   this.doBarrage(unit);     break;
      case 'airstrike': this.doAirstrike(unit);   break;
      case 'heal':      this.doHeal();            break;
    }
  }

  /**
   * 유닛 타입 → 스킬 타입 매핑
   */
  private getSkillType(type: Unit['unitData']['type']): SkillType {
    const map: Record<string, SkillType> = {
      infantry: 'charge',
      tank:     'barrage',
      air:      'airstrike',
      special:  'heal',
    };
    return map[type] ?? 'charge';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 스킬 효과 구현
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 돌진 (charge) — 보병 유닛 전체 2초간 속도 2배
   * 효과 종료 후 원래 speed로 복원한다.
   */
  private doCharge(): void {
    const infantryUnits = this.getPlayerUnits().filter(
      (u) => u.isAlive && u.unitData.type === 'infantry',
    );

    infantryUnits.forEach((u) => {
      const originalSpeed = u.unitData.speed;
      u.setSpeed(originalSpeed * 2);

      // 2초 후 속도 복원
      this.scene.time.delayedCall(2000, () => {
        if (u.isAlive) u.setSpeed(originalSpeed);
      });
    });

    // 시각 효과 — 아군 거점 방향(하단) 원형 플래시
    this.spawnFlashCircle(195, 420, 80, 0x44aaff, 0.5, 400);
  }

  /**
   * 포격 (barrage) — 발동 유닛 반경 100px 이내 적군 전체에 attack×3 피해
   * 즉시 발동, 지속 없음.
   */
  private doBarrage(unit: Unit): void {
    const radius  = 100;
    const enemies = this.getEnemyUnits().filter(
      (e) => e.isAlive && Math.hypot(e.x - unit.x, e.y - unit.y) <= radius,
    );

    enemies.forEach((e) => e.takeDamage(unit.unitData.attack * 3));

    // 시각 효과 — 폭발 원형
    this.spawnFlashCircle(unit.x, unit.y, radius, 0xffaa00, 0.45, 350);
  }

  /**
   * 폭격 (airstrike) — 맵 중앙(195, 240) 반경 150px 범위에 5회 다단 피해
   * 0.4초 간격, 총 2초 지속.
   */
  private doAirstrike(unit: Unit): void {
    // 폭격 중심: 맵 중앙 거점
    const tx = 195;
    const ty = 240;
    const radius = 150;
    let   count  = 0;

    const event = this.scene.time.addEvent({
      delay: 400,
      repeat: 4,  // 5회 발동 (0, 400, 800, 1200, 1600ms)
      callback: () => {
        count++;

        // 범위 내 적 유닛 피해
        this.getEnemyUnits()
          .filter((e) => e.isAlive && Math.hypot(e.x - tx, e.y - ty) <= radius)
          .forEach((e) => e.takeDamage(unit.unitData.attack * 1.5));

        // 타격 당 플래시 (점점 작아지는 원)
        const r = radius * (1 - (count - 1) * 0.15);
        this.spawnFlashCircle(tx, ty, r, 0xff4400, 0.35 - count * 0.04, 300);

        if (count >= 5) event.destroy();
      },
    });
  }

  /**
   * 힐 (heal) — HP 비율이 가장 낮은 아군 유닛 1명에게 maxHp의 50% 회복
   * 즉시 발동, 지속 없음.
   */
  private doHeal(): void {
    const alive = this.getPlayerUnits().filter((u) => u.isAlive);
    if (alive.length === 0) return;

    // HP 비율 기준 오름차순 정렬 → 가장 낮은 유닛 선택
    const target = alive.slice().sort(
      (a, b) =>
        (a.unitData.hp / a.unitData.maxHp) - (b.unitData.hp / b.unitData.maxHp),
    )[0];

    const healAmount = Math.round(target.unitData.maxHp * 0.5);
    target.heal(healAmount);

    // 시각 효과 — 치유 대상 위 녹색 플래시
    this.spawnFlashCircle(target.x, target.y, 30, 0x44ff88, 0.6, 500);
  }

  /**
   * 시각 효과 헬퍼 — 지정 위치에 반투명 원을 생성하고 지정 시간 후 파괴한다.
   * update() 루프 밖(delayedCall 내부)에서만 호출되므로 new Circle 허용.
   */
  private spawnFlashCircle(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
    duration: number,
  ): void {
    const circle = this.scene.add.circle(x, y, radius, color, alpha).setDepth(15);
    this.scene.time.delayedCall(duration, () => circle.destroy());
  }
}
