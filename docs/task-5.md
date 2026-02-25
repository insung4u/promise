# Task 5 — AutoAI + CommandSystem

> 담당 에이전트: `ai-agent`
> 의존성: **Task 4 완료 후** 착수 (Unit 클래스, BattleScene 필요)
> 다음 Task: Task 6 (SkillSystem은 AI 완료 후)

---

## 목표

AI가 자동으로 전투를 수행하는 `AutoAI`와,
스와이프 제스처를 전체 유닛 이동 명령으로 변환하는 `CommandSystem`을 구현한다.

---

## 생성할 파일 목록

```
src/game/systems/
├── AutoAI.ts               ← 자동 공격 + 거점 이동 AI
└── CommandSystem.ts        ← 스와이프 명령 → moveTo 큐잉
```

---

## AutoAI 동작 규칙

### 우선순위 (매 프레임 평가)

```
1순위: 사정거리 내 적 존재 → 공격
2순위: 가장 가까운 거점(미점령/적 점령) → 이동
3순위: 가장 가까운 적 → 추적 이동
```

### 공격 로직

- 사정거리 = `unit.attackRange` (픽셀)
- 근접(range=1): 적과 거리 ≤ 50px → `target.takeDamage(unit.attack)`
- 원거리(range>1): 사정거리 내 → `Projectile.fire()` 호출

### 쿨타임 관리

```typescript
// update()에서 쿨타임 감소 — 클래스 멤버 변수로 관리 (new 금지)
private attackCooldowns = new Map<string, number>();
const ATTACK_INTERVAL = 1000; // ms
```

---

## 구현 상세

### src/game/systems/AutoAI.ts

```typescript
import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { ObjectPool } from '../entities/ObjectPool';
import { Projectile } from '../entities/Projectile';
import type { CapturePoint } from '@/types';

/**
 * 자동 전투 AI
 * 매 프레임 플레이어/적 유닛의 행동을 결정한다.
 * faction 파라미터로 진영을 구분하여, 플레이어/적군 양쪽에 재사용 가능.
 * update() 내 new 금지 — 모든 재사용 객체는 ObjectPool 또는 멤버 변수.
 */
export class AutoAI {
  private attackCooldowns = new Map<string, number>();
  private readonly ATTACK_INTERVAL = 1000; // ms
  private projPool: ObjectPool;
  private faction: 'player' | 'enemy';

  constructor(
    private scene: Phaser.Scene,
    projPool: ObjectPool,
    faction: 'player' | 'enemy' = 'player'
  ) {
    this.projPool = projPool;
    this.faction = faction;
  }

  /**
   * 매 프레임 호출
   * @param units       행동할 유닛 배열 (플레이어 or 적)
   * @param enemies     적 유닛 배열
   * @param capturePoints 거점 배열
   * @param delta       프레임 델타(ms)
   */
  update(
    units: Unit[],
    enemies: Unit[],
    capturePoints: CapturePoint[],
    delta: number
  ): void {
    for (const unit of units) {
      if (!unit.isAlive) continue;
      this.tickCooldown(unit.unitData.id, delta);
      this.decide(unit, enemies, capturePoints);
    }
  }

  private tickCooldown(id: string, delta: number): void {
    const current = this.attackCooldowns.get(id) ?? 0;
    this.attackCooldowns.set(id, Math.max(0, current - delta));
  }

  private decide(unit: Unit, enemies: Unit[], cps: CapturePoint[]): void {
    const aliveEnemies = enemies.filter((e) => e.isAlive);

    // 1순위: 사정거리 내 적 공격
    const inRange = this.findClosest(unit, aliveEnemies, unit.attackRange);
    if (inRange && this.canAttack(unit.unitData.id)) {
      this.attack(unit, inRange);
      return;
    }

    // 2순위: 미점령/적 점령 거점 이동
    const targetCP = this.findPriorityCP(unit, cps);
    if (targetCP) {
      unit.moveTo(targetCP.x, targetCP.y);
      return;
    }

    // 3순위: 가장 가까운 적 추적
    const nearest = this.findClosest(unit, aliveEnemies, Infinity);
    if (nearest) unit.moveTo(nearest.x, nearest.y);
  }

  private canAttack(id: string): boolean {
    return (this.attackCooldowns.get(id) ?? 0) <= 0;
  }

  private attack(attacker: Unit, target: Unit): void {
    this.attackCooldowns.set(attacker.unitData.id, this.ATTACK_INTERVAL);

    if (attacker.unitData.range <= 1) {
      // 근접 공격
      target.takeDamage(attacker.unitData.attack);
    } else {
      // 원거리 — Object Pool에서 투사체 획득
      const proj = this.projPool.get() as Projectile | null;
      if (proj) {
        proj.fire(attacker.x, attacker.y, target.x, target.y, attacker.unitData.attack);
      }
    }
  }

  private findClosest(origin: Unit, targets: Unit[], maxDist: number): Unit | null {
    let closest: Unit | null = null;
    let minDist = maxDist;
    for (const t of targets) {
      const dx = t.x - origin.x;
      const dy = t.y - origin.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) { minDist = d; closest = t; }
    }
    return closest;
  }

  /**
   * 점령 우선순위: 중립 > 상대 점령 (가장 가까운 것)
   * this.faction으로 자기 진영을 판별하여, 양측 AI에 동일하게 재사용 가능.
   */
  private findPriorityCP(unit: Unit, cps: CapturePoint[]): CapturePoint | null {
    const targets = cps
      .filter((cp) => cp.owner !== this.faction)
      .sort((a, b) => {
        const da = Math.hypot(a.x - unit.x, a.y - unit.y);
        const db = Math.hypot(b.x - unit.x, b.y - unit.y);
        // 중립 우선 + 거리 가중치
        const pa = (a.owner === 'neutral' ? 0 : 1) + da / 1000;
        const pb = (b.owner === 'neutral' ? 0 : 1) + db / 1000;
        return pa - pb;
      });
    return targets[0] ?? null;
  }
}
```

### src/game/systems/CommandSystem.ts

```typescript
import { EventBus } from '../core/EventBus';
import { Unit } from '../entities/Unit';
import type { CapturePoint } from '@/types';

/**
 * 스와이프 명령 → 전체 유닛 moveTo 큐잉
 * EventBus의 'battle:swipe' 이벤트를 수신하여 명령을 실행한다.
 */
export class CommandSystem {
  private autoMode = true;

  constructor(
    private getPlayerUnits: () => Unit[],
    private capturePoints: CapturePoint[]
  ) {
    this.registerListeners();
  }

  private registerListeners(): void {
    EventBus.on('battle:swipe', ({ direction }) => {
      if (this.autoMode) return;   // 오토 모드면 스와이프 무시
      this.handleSwipe(direction);
    });

    EventBus.on('battle:autoToggle', ({ auto }) => {
      this.autoMode = auto;
    });
  }

  private handleSwipe(direction: 'up' | 'down' | 'left' | 'right' | 'center'): void {
    const units = this.getPlayerUnits().filter((u) => u.isAlive);

    const targets: Record<string, { x: number; y: number }> = {
      up:     { x: 400, y: 100 },   // 적 진영 방향
      down:   { x: 650, y: 500 },   // 아군 거점 방향
      left:   { x: 150, y: 300 },   // 좌 집결
      right:  { x: 650, y: 300 },   // 우 집결
      center: { x: 400, y: 300 },   // 중앙 거점
    };

    const target = targets[direction];
    if (!target) return;

    // 유닛별로 약간씩 오프셋을 주어 겹침 방지
    units.forEach((unit, i) => {
      const offset = { x: (i % 3 - 1) * 35, y: Math.floor(i / 3) * 35 };
      unit.moveTo(target.x + offset.x, target.y + offset.y);
    });
  }

  destroy(): void {
    EventBus.off('battle:swipe');
    EventBus.off('battle:autoToggle');
  }
}
```

---

## React HUD — 스와이프 존 (app/ui에 추가)

```typescript
// src/app/ui/components/SwipeZone.tsx
// 왼쪽 30% 영역에 배치
// Hammer.js 또는 Phaser 내장 터치 이벤트로 스와이프 감지
// EventBus.emit('battle:swipe', { direction }) 호출

import { useEffect, useRef } from 'react';
import { EventBus } from '@/game/core/EventBus';

export default function SwipeZone() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0, startY = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      if (absDx < 20 && absDy < 20) {
        EventBus.emit('battle:swipe', { direction: 'center' });
        return;
      }
      if (absDx > absDy) {
        EventBus.emit('battle:swipe', { direction: dx > 0 ? 'right' : 'left' });
      } else {
        EventBus.emit('battle:swipe', { direction: dy > 0 ? 'down' : 'up' });
      }
    };

    el.addEventListener('touchstart', onStart);
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 w-[30%] h-full bg-black/20 flex items-center justify-center"
    >
      <span className="text-white/40 text-sm rotate-90">SWIPE</span>
    </div>
  );
}
```

---

## 거점 점령과 AutoAI 연동

거점 점령 진행(`captureProgress` 증감)은 **BattleScene.updateCaptureProgress()** 에서 처리한다.
AutoAI는 유닛을 거점 방향으로 이동시키는 역할만 하며, 점령 판정은 BattleScene에 위임한다.

```
흐름:
  AutoAI.decide()
    → unit.moveTo(capturePoint.x, capturePoint.y)
        → Unit.preUpdate()에서 이동
            → BattleScene.updateCaptureProgress()에서 반경 체크
                → captureProgress 증감 → owner 변경
```

AutoAI가 `findPriorityCP()` 에서 거점 우선순위를 계산할 때,
이미 `owner === 'player'`인 거점은 제외하므로 점령 완료 후 자연스럽게 다음 목표로 전환된다.

---

## 완료 조건

- [ ] AutoAI: 플레이어 유닛이 가장 가까운 적을 자동 공격
- [ ] AutoAI: 미점령/적 점령 거점 방향으로 자동 이동
- [ ] AutoAI: 거점 점령 완료 후 다음 미점령 거점으로 목표 자동 전환
- [ ] AutoAI: 쿨타임 정상 동작 (1000ms 간격 공격)
- [ ] CommandSystem: 스와이프 방향 → 전체 유닛 이동 명령
- [ ] AutoToggle: ON → AI 자동, OFF → 스와이프 명령만 수신
- [ ] SwipeZone: 터치 스와이프 → EventBus 이벤트 발행
- [ ] 유닛이 거점 위에 서면 BattleScene에서 점령 진행 확인 (연동 검증)
- [ ] `update()` 루프에 `new` 없음 (재사용 변수 사용)
- [ ] TypeScript strict 통과
