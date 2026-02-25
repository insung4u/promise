# Task 6 — SkillSystem + 승패 판정

> 담당 에이전트: `skill-agent`
> 의존성: **Task 4, Task 5 완료 후** 착수 (Unit, AutoAI 필요)
> 다음 Task: Task 7 (독립적으로 착수 가능)

---

## 목표

4종 스킬 효과를 구현하고, 공격/방어 모드별 승패 판정 로직과
전투 결과 화면 전환을 완성한다.

---

## 생성할 파일 목록

```
src/game/systems/
└── SkillSystem.ts              ← 스킬 효과 + 쿨타임 관리

src/app/ui/
├── BattleHUD.tsx               ← 전투 중 HUD (타이머, 점수, 스킬 버튼, 오토토글)
└── BattleResultScreen.tsx      ← 전투 결과 화면
```

---

## 스킬 상세

| 병과 | 스킬명 | 효과 | 쿨타임 | 지속시간 |
|---|---|---|---|---|
| 보병 (infantry) | 돌진 (charge) | 속도 2.5× + 사정거리 내 즉시 공격 | 15초 | 3초 |
| 전차 (tank) | 포격 (barrage) | 전방 반경 100px 범위 피해 (ATK × 3) | 20초 | 즉시 |
| 공군 (air) | 폭격 (airstrike) | 지정 영역(200px) 다단 피해 × 5회 | 25초 | 2초 |
| 특수 (special) | 힐 (heal) | 아군 유닛 전체 HP 30% 회복 | 20초 | 즉시 |

---

## 구현 상세

### src/game/systems/SkillSystem.ts

```typescript
import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { EventBus } from '../core/EventBus';
import type { SkillType } from '@/types';

/**
 * 스킬 시스템
 * EventBus의 'battle:skill' 이벤트를 수신하여 스킬을 발동한다.
 * 쿨타임은 Map으로 관리, update()에서 감소.
 */
export class SkillSystem {
  // unitId → 남은 쿨타임(ms)
  private cooldowns = new Map<string, number>();

  private readonly COOLDOWNS_MS: Record<SkillType, number> = {
    charge:    15000,
    barrage:   20000,
    airstrike: 25000,
    heal:      20000,
  };

  constructor(
    private scene: Phaser.Scene,
    private getPlayerUnits: () => Unit[],
    private getEnemyUnits:  () => Unit[]
  ) {
    this.registerListeners();
  }

  private registerListeners(): void {
    EventBus.on('battle:skill', ({ unitId, skillIndex }) => {
      const units = this.getPlayerUnits();
      const unit = units[skillIndex];
      if (!unit || !unit.isAlive) return;
      this.activate(unit);
    });
  }

  /**
   * 매 프레임 호출 — 쿨타임 감소
   */
  update(delta: number): void {
    for (const [id, cd] of this.cooldowns) {
      this.cooldowns.set(id, Math.max(0, cd - delta));
    }
  }

  private activate(unit: Unit): void {
    const id = unit.unitData.id;
    if ((this.cooldowns.get(id) ?? 0) > 0) return;  // 쿨타임 중

    const skill = this.getSkillType(unit.unitData.type);
    this.cooldowns.set(id, this.COOLDOWNS_MS[skill]);

    switch (skill) {
      case 'charge':    this.doCharge(unit);    break;
      case 'barrage':   this.doBarrage(unit);   break;
      case 'airstrike': this.doAirstrike(unit); break;
      case 'heal':      this.doHeal();          break;
    }
  }

  private getSkillType(type: Unit['unitData']['type']): SkillType {
    const map: Record<string, SkillType> = {
      infantry: 'charge',
      tank:     'barrage',
      air:      'airstrike',
      special:  'heal',
    };
    return map[type] ?? 'charge';
  }

  // 돌진: 3초간 속도 2.5×, 사정거리 내 적 즉시 공격
  private doCharge(unit: Unit): void {
    const origSpeed = unit.unitData.speed;
    (unit.unitData as { speed: number }).speed = origSpeed * 2.5;
    // 가장 가까운 적 즉시 공격
    const nearest = this.getNearestEnemy(unit);
    if (nearest) nearest.takeDamage(unit.unitData.attack * 2);

    this.scene.time.delayedCall(3000, () => {
      (unit.unitData as { speed: number }).speed = origSpeed;
    });
  }

  // 포격: 전방 반경 100px 피해
  private doBarrage(unit: Unit): void {
    const enemies = this.getEnemyUnits().filter((e) => {
      const d = Math.hypot(e.x - unit.x, e.y - unit.y);
      return e.isAlive && d <= 100;
    });
    enemies.forEach((e) => e.takeDamage(unit.unitData.attack * 3));

    // 폭발 시각 효과
    const circle = this.scene.add.circle(unit.x, unit.y, 100, 0xffaa00, 0.4);
    this.scene.time.delayedCall(300, () => circle.destroy());
  }

  // 폭격: 지정 영역 200px 다단 피해 × 5회 (0.4초 간격)
  private doAirstrike(unit: Unit): void {
    const tx = unit.x + (unit.unitData.type === 'air' ? -100 : 0);
    const ty = unit.y;
    let count = 0;

    const interval = this.scene.time.addEvent({
      delay: 400,
      repeat: 4,
      callback: () => {
        count++;
        this.getEnemyUnits()
          .filter((e) => e.isAlive && Math.hypot(e.x - tx, e.y - ty) <= 200)
          .forEach((e) => e.takeDamage(unit.unitData.attack * 1.5));
        this.scene.add.circle(tx, ty, 200 * (count / 5), 0xff4400, 0.3 - count * 0.05);
        if (count >= 5) interval.destroy();
      },
    });
  }

  // 힐: 아군 유닛 전체 HP 30% 회복
  private doHeal(): void {
    this.getPlayerUnits()
      .filter((u) => u.isAlive)
      .forEach((u) => {
        const heal = Math.round(u.unitData.maxHp * 0.3);
        (u.unitData as { hp: number }).hp = Math.min(u.unitData.maxHp, u.unitData.hp + heal);
      });
  }

  private getNearestEnemy(unit: Unit): Unit | null {
    return this.getEnemyUnits()
      .filter((e) => e.isAlive)
      .sort((a, b) => Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y))
      [0] ?? null;
  }

  getCooldownRatio(unitId: string, skillType: SkillType): number {
    const remaining = this.cooldowns.get(unitId) ?? 0;
    return remaining / this.COOLDOWNS_MS[skillType];  // 0.0 ~ 1.0
  }

  destroy(): void {
    EventBus.off('battle:skill');
  }
}
```

---

## 승패 판정 로직 (BattleScene에 추가)

```typescript
// BattleScene.ts 내 checkWinCondition() — 매 프레임 체크

private checkWinCondition(): void {
  const playerAlive = this.playerUnits.filter((u) => u.isAlive).length;
  const enemyAlive  = this.enemyUnits.filter((u) => u.isAlive).length;
  const playerCPs   = this.capturePoints.filter((cp) => cp.owner === 'player').length;
  const enemyCPs    = this.capturePoints.filter((cp) => cp.owner === 'enemy').length;

  if (this.mode === 'attack') {
    // 공격 모드: 적 전멸 OR 거점 과반 점령 → 승리
    if (enemyAlive === 0 || playerCPs >= 2) {
      this.endBattle('win');
    } else if (playerAlive === 0) {
      this.endBattle('lose');
    }
  } else {
    // 방어 모드: 시간이 다 될 때까지 거점 1개 이상 유지 → 승리
    if (playerCPs === 0 || playerAlive === 0) {
      this.endBattle('lose');
    }
    // 시간 초과 → 승리는 BattleScene.handleTimeUp()에서 처리
  }
}

private endBattle(result: 'win' | 'lose'): void {
  const survivalCount = this.playerUnits.filter((u) => u.isAlive).length;
  EventBus.emit('battle:result', {
    result,
    mode: this.mode,
    survivalCount,
    timeElapsed: (this.mode === 'attack' ? this.maxTime : 0) - this.timeLeft,
    resourceReward: result === 'win' ? 200 + survivalCount * 20 : 50,
    fameReward:     result === 'win' ? 100 + survivalCount * 10 : 10,
  });
}
```

---

### src/app/ui/BattleHUD.tsx

```typescript
// 전투 중 HUD 레이어 (Phaser Canvas 위에 absolute 포지션)
// EventBus.on('battle:hud') → 타이머/점수 업데이트
// 스킬 버튼 4개 (덱 순서대로)
// 오토/수동 토글 버튼

interface HUDState {
  timeLeft: number;
  playerScore: number;
  enemyScore: number;
}
```

### src/app/ui/BattleResultScreen.tsx

```typescript
// 전투 결과 화면
// Props: BattleResult
// 표시: 승/패 아이콘, 생존 유닛 수, 자원/명성 획득량
// 버튼: "로비로 돌아가기" → useBattleStore.endBattle() 후 App.tsx에서 LobbyScreen 전환
```

---

## 완료 조건

- [ ] 4종 스킬 발동 및 시각 효과 확인
- [ ] 스킬 쿨타임 표시 (HUD 스킬 버튼 오버레이)
- [ ] 공격 모드: 적 전멸 or 거점 2/3 점령 → 승리 판정
- [ ] 방어 모드: 시간 초과 → 거점 유지 수로 승패 판정
- [ ] 플레이어 전멸 → 패배 판정
- [ ] `battle:result` EventBus 이벤트 → React 결과 화면 전환
- [ ] 결과 화면 표시 (승/패, 보상 수치)
- [ ] 로비로 돌아가기 버튼 동작
- [ ] TypeScript strict 통과
