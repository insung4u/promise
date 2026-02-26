import { Unit } from '../entities/Unit';
import { ObjectPool } from '../entities/ObjectPool';
import { Projectile } from '../entities/Projectile';
import type { CapturePoint } from '@/types';

/**
 * 자동 전투 AI
 *
 * 플레이어/적군 유닛이 스스로 전투 행동을 결정한다.
 * faction 파라미터로 진영을 구분하여 양측 AI에 동일하게 재사용 가능하다.
 *
 * 행동 우선순위 (매 프레임 유닛별 평가):
 *   1순위: 사정거리 내 적 존재 → 공격 (쿨타임 소진 시)
 *   2순위: 미점령 또는 적 점령 거점 존재 → 거점 방향 이동
 *   3순위: 가장 가까운 적 유닛 → 추적 이동
 *
 * 성능 규칙:
 *   - update() 내 new 생성 금지
 *   - attackCooldowns Map 멤버 변수로 재사용 (쿨타임 관리)
 *   - 투사체는 ObjectPool에서 꺼내 재사용
 */
export class AutoAI {
  /** 진영 ('player' | 'enemy') */
  private readonly faction: 'player' | 'enemy';

  /** 투사체 Object Pool (원거리 유닛 공격용) */
  private readonly projPool: ObjectPool;

  /** 유닛별 공격 쿨타임 (ms 단위 잔여 시간) — Map 재사용 (new 방지) */
  private readonly attackCooldowns = new Map<string, number>();

  /**
   * update() 내 배열 할당 방지용 살아있는 적 유닛 캐시
   * 매 update() 시작 시 in-place로 채워 재사용한다.
   */
  private readonly _aliveEnemyCache: Unit[] = [];

  /** 공격 간격 (ms) */
  private readonly ATTACK_INTERVAL = 1000;

  /** 오토 모드 활성화 여부 */
  private enabled = true;

  /**
   * @param projPool - BattleScene에서 생성된 투사체 풀
   * @param faction  - 이 AI가 조종할 진영
   */
  constructor(projPool: ObjectPool, faction: 'player' | 'enemy') {
    this.projPool = projPool;
    this.faction  = faction;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 퍼블릭 API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 매 프레임 BattleScene.update()에서 호출
   *
   * @param units         행동할 유닛 배열 (이 AI의 진영)
   * @param enemies       적군 유닛 배열
   * @param capturePoints 거점 배열
   * @param delta         프레임 델타 (ms)
   */
  update(
    units: Unit[],
    enemies: Unit[],
    capturePoints: CapturePoint[],
    delta: number,
  ): void {
    if (!this.enabled) return;

    // 캐시 배열 in-place 채우기 — update() 당 new 배열 생성 완전 제거
    this._aliveEnemyCache.length = 0;
    for (const e of enemies) {
      if (e.isAlive) this._aliveEnemyCache.push(e);
    }

    for (const unit of units) {
      if (!unit.isAlive) continue;

      // 쿨타임 감소
      this.tickCooldown(unit.unitData.id, delta);

      // 행동 결정
      this.decide(unit, this._aliveEnemyCache, capturePoints);
    }
  }

  /**
   * 오토 AI 활성화/비활성화 토글
   * OFF 시에는 update()가 아무 동작도 하지 않는다.
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 유닛별 공격 쿨타임을 delta만큼 감소한다.
   * 0 미만으로 내려가지 않도록 clamp.
   */
  private tickCooldown(id: string, delta: number): void {
    const current = this.attackCooldowns.get(id) ?? 0;
    if (current > 0) {
      this.attackCooldowns.set(id, Math.max(0, current - delta));
    }
  }

  /**
   * 유닛 한 개의 프레임별 행동 결정
   * 우선순위: 사정거리 공격 → 거점 이동 → 적 추적
   * aliveEnemies는 update()에서 미리 필터링해서 전달받는다.
   */
  private decide(unit: Unit, aliveEnemies: Unit[], cps: CapturePoint[]): void {

    // ─ 1순위: 사정거리 내 적 공격 ─────────────────────────────────────
    const inRange = this.findClosest(unit, aliveEnemies, unit.attackRangePx);
    if (inRange && this.canAttack(unit.unitData.id)) {
      this.performAttack(unit, inRange);
      return;
    }

    // ─ 2순위: 미점령/적 점령 거점 방향 이동 ─────────────────────────
    const targetCP = this.findPriorityCP(unit, cps);
    if (targetCP) {
      unit.moveTo(targetCP.x, targetCP.y);
      return;
    }

    // ─ 3순위: 가장 가까운 적 추적 ────────────────────────────────────
    const nearest = this.findClosest(unit, aliveEnemies, Infinity);
    if (nearest) {
      unit.moveTo(nearest.x, nearest.y);
    }
  }

  /** 공격 쿨타임 소진 여부 확인 */
  private canAttack(id: string): boolean {
    return (this.attackCooldowns.get(id) ?? 0) <= 0;
  }

  /**
   * 실제 공격 실행
   * - 근접(range ≤ 1): 직접 takeDamage
   * - 원거리(range > 1): ObjectPool에서 투사체 꺼내 fire()
   */
  private performAttack(attacker: Unit, target: Unit): void {
    // 쿨타임 리셋
    this.attackCooldowns.set(attacker.unitData.id, this.ATTACK_INTERVAL);

    if (attacker.unitData.range <= 1) {
      // 근접 공격 — 직접 데미지
      target.takeDamage(attacker.unitData.attack);
    } else {
      // 원거리 공격 — 투사체 발사
      const proj = this.projPool.get() as Projectile | null;
      if (proj) {
        proj.fire(
          attacker.x,
          attacker.y,
          target.x,
          target.y,
          attacker.unitData.attack,
          attacker.unitData.id,
        );
      }
    }
  }

  /**
   * 지정 범위 내 가장 가까운 유닛 탐색
   * 범위 밖이면 null 반환.
   *
   * @param origin   - 기준 유닛
   * @param targets  - 탐색 대상 배열
   * @param maxDist  - 최대 거리 (px), Infinity면 전체 탐색
   */
  private findClosest(origin: Unit, targets: Unit[], maxDist: number): Unit | null {
    let closest: Unit | null = null;
    let minDist = maxDist;

    for (const t of targets) {
      const dx = t.x - origin.x;
      const dy = t.y - origin.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist  = d;
        closest  = t;
      }
    }
    return closest;
  }

  /**
   * 점령 우선순위 거점 선택
   *
   * 자기 진영 소유 거점은 제외하고,
   * 중립 거점 > 적 소유 거점 순으로 우선순위를 매긴다.
   * 동일 우선순위면 거리가 가까운 쪽을 선택한다.
   *
   * 점령 완료 후 자기 진영이 되면 자연스럽게 다음 목표로 전환된다.
   */
  private findPriorityCP(unit: Unit, cps: CapturePoint[]): CapturePoint | null {
    const candidates = cps.filter((cp) => cp.owner !== this.faction);
    if (candidates.length === 0) return null;

    // 점수 기준: 중립(0) < 적 소유(1), 거리 가중치 추가
    candidates.sort((a, b) => {
      const da = Math.hypot(a.x - unit.x, a.y - unit.y);
      const db = Math.hypot(b.x - unit.x, b.y - unit.y);
      const pa = (a.owner === 'neutral' ? 0 : 1) + da / 1000;
      const pb = (b.owner === 'neutral' ? 0 : 1) + db / 1000;
      return pa - pb;
    });

    return candidates[0] ?? null;
  }
}
