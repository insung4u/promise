# Task 4 — Unit 클래스 + 4종 유닛

> 담당 에이전트: `unit-agent`
> 의존성: **Task 3 완료 후** 착수 (BattleScene, ObjectPool 필요)
> 다음 Task: Task 5 (AutoAI는 Unit 클래스 필요)

---

## 목표

Unit 기반 클래스와 4종 유닛(보병/전차/공군/특수)을 구현한다.
Placeholder 스프라이트, 이동 애니메이션, 공격 애니메이션, HP 바를 포함한다.

> 스프라이트 규격, 애니메이션 프레임/속도, HP 바 색상 규칙, 사망 이펙트:
> **`docs/design.md` 섹션 3~4** 참조

---

## 생성할 파일 목록

```
src/game/entities/
├── Unit.ts                 ← Unit 기반 클래스
├── UnitFactory.ts          ← UnitData → Unit 인스턴스 생성
└── Projectile.ts           ← 투사체 (원거리 유닛용, Object Pool 사용)
```

---

## 유닛 스탯 기준값 (tier 1 기준, game-systems-reference.md 참고)

| 유닛 | 공격력 | 방어력 | 체력 | 사정거리 | 속도 | 스킬 |
|---|---|---|---|---|---|---|
| 보병 (infantry) | 10 | 14 | 100 | 1 (근접) | 80 | 돌진 (charge) |
| 전차 (tank) | 18 | 8 | 120 | 1 (근접) | 50 | 포격 (barrage) |
| 공군 (air) | 8 | 6 | 60 | 5 (단거리) | 100 | 폭격 (airstrike) |
| 특수 (special) | 6 | 10 | 80 | 3 (단거리) | 70 | 힐 (heal) |

티어별 배율: T1×1 / T2×1.8 / T3×3 / T4×5 / T5×8 / T6×12

---

## 구현 상세

### src/game/entities/Unit.ts

```typescript
import Phaser from 'phaser';
import type { UnitData } from '@/types';

/**
 * 전투 유닛 기반 클래스
 * 모든 유닛 타입이 상속한다.
 * Arcade Physics를 활용해 물리 이동을 처리한다.
 * update() 내 new 생성 금지 — 이동 벡터는 멤버 변수로 재사용.
 */
export class Unit extends Phaser.Physics.Arcade.Sprite {
  private data: UnitData;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private moveTarget: Phaser.Math.Vector2 | null = null;
  private _isAlive = true;

  // 재사용 벡터 — update()에서 new 방지
  private readonly _velocity = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, data: UnitData) {
    super(scene, data.position.x, data.position.y, data.type);
    this.data = { ...data };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTint(this.getTintByType(data.type));
    this.buildHpBar();
  }

  private getTintByType(type: UnitData['type']): number {
    const colors: Record<string, number> = {
      infantry: 0x4488ff,
      tank:     0xffaa00,
      air:      0x44ffcc,
      special:  0xff44aa,
    };
    return colors[type] ?? 0xffffff;
  }

  private buildHpBar(): void {
    // 배경 (회색)
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 22, 28, 4, 0x333333);
    // HP (녹색 → 빨강으로 변화)
    this.hpBar = this.scene.add.graphics();
    this.redrawHpBar();
  }

  private redrawHpBar(): void {
    const ratio = this.data.hp / this.data.maxHp;
    const color = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffff00 : 0xff4444;
    this.hpBar.clear();
    this.hpBar.fillStyle(color);
    this.hpBar.fillRect(this.x - 14, this.y - 24, 28 * ratio, 4);
    this.hpBarBg.setPosition(this.x, this.y - 22);
  }

  // 이동 목표 설정 (CommandSystem / AutoAI에서 호출)
  moveTo(x: number, y: number): void {
    if (!this.moveTarget) {
      this.moveTarget = new Phaser.Math.Vector2(x, y);
    } else {
      this.moveTarget.set(x, y);
    }
  }

  // 데미지 적용
  takeDamage(amount: number): void {
    const actual = Math.max(0, amount - this.data.defense * 0.1);
    this.data.hp = Math.max(0, this.data.hp - actual);
    this.redrawHpBar();  // 값 변경 시에만 재드로우
    if (this.data.hp <= 0) this.die();
  }

  private die(): void {
    this._isAlive = false;
    this.data.isAlive = false;
    this.setVisible(false);
    this.setActive(false);
    this.hpBar.setVisible(false);
    this.hpBarBg.setVisible(false);
    if (this.body) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  // 속도 변경 (스킬 돌진 등에서 사용)
  setSpeed(speed: number): void {
    this.data.speed = speed;
  }

  // HP 회복 (스킬 힐 등에서 사용, maxHp 초과 불가)
  heal(amount: number): void {
    this.data.hp = Math.min(this.data.maxHp, this.data.hp + amount);
    this.redrawHpBar();
  }

  get isAlive(): boolean { return this._isAlive; }
  get unitData(): UnitData { return this.data; }
  get attackRange(): number { return this.data.range * 50; }   // 픽셀 변환

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this._isAlive || !this.moveTarget) {
      if (this.body) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    const dx = this.moveTarget.x - this.x;
    const dy = this.moveTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.moveTarget = null;
      if (this.body) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      return;
    }

    const speed = this.data.speed;
    this._velocity.set(dx / dist * speed, dy / dist * speed);
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(this._velocity.x, this._velocity.y);
    }
    // HP 바 위치 동기화
    this.redrawHpBar();
  }
}
```

### src/game/entities/UnitFactory.ts

```typescript
import Phaser from 'phaser';
import { Unit } from './Unit';
import type { UnitData } from '@/types';

// 기본 스탯 (tier 1 기준)
const BASE_STATS: Record<UnitData['type'], Partial<UnitData>> = {
  infantry: { attack: 10, defense: 14, hp: 100, maxHp: 100, range: 1, speed: 80,  cargo: 8,  foodCost: 0.21 },
  tank:     { attack: 18, defense: 8,  hp: 120, maxHp: 120, range: 1, speed: 50,  cargo: 13, foodCost: 0.42 },
  air:      { attack: 8,  defense: 6,  hp: 60,  maxHp: 60,  range: 5, speed: 100, cargo: 6,  foodCost: 0.62 },
  special:  { attack: 6,  defense: 10, hp: 80,  maxHp: 80,  range: 3, speed: 70,  cargo: 10, foodCost: 0.42 },
};

// 티어 배율: T1~T6
const TIER_MULTIPLIER = [1, 1.8, 3, 5, 8, 12];

/**
 * UnitData를 받아 스탯 계산 후 Unit 인스턴스를 생성한다.
 */
export class UnitFactory {
  static create(scene: Phaser.Scene, data: UnitData): Unit {
    const base = BASE_STATS[data.type];
    const mult = TIER_MULTIPLIER[Math.min(data.tier - 1, 5)];

    const fullData: UnitData = {
      ...data,
      attack:   Math.round((base.attack ?? 10)   * mult),
      defense:  Math.round((base.defense ?? 5)   * mult),
      hp:       Math.round((base.hp ?? 100)      * mult),
      maxHp:    Math.round((base.maxHp ?? 100)   * mult),
      speed:    base.speed ?? 80,
      range:    base.range ?? 1,
      cargo:    base.cargo ?? 8,
      foodCost: base.foodCost ?? 0.21,
    };

    return new Unit(scene, fullData);
  }
}
```

### src/game/entities/Projectile.ts

```typescript
import Phaser from 'phaser';

/**
 * 투사체 — 원거리 유닛(공군/특수)이 사용
 * ObjectPool에서 꺼내 재사용. update()에서 new 금지.
 */
export class Projectile extends Phaser.GameObjects.Rectangle {
  private targetX = 0;
  private targetY = 0;
  private damage = 0;
  private speed = 300;
  private readonly _vel = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 8, 8, 0xffff00);
    scene.add.existing(this);
    this.setActive(false).setVisible(false);
  }

  fire(x: number, y: number, tx: number, ty: number, damage: number): void {
    this.setPosition(x, y).setActive(true).setVisible(true);
    this.targetX = tx;
    this.targetY = ty;
    this.damage = damage;
  }

  preUpdate(_time: number, delta: number): void {
    if (!this.active) return;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) {
      this.setActive(false).setVisible(false);
      return;
    }
    const s = this.speed * (delta / 1000);
    this._vel.set(dx / dist * s, dy / dist * s);
    this.x += this._vel.x;
    this.y += this._vel.y;
  }

  getDamage(): number { return this.damage; }
}
```

---

## BattleScene 연동 (Task 3에 추가할 내용)

`BattleScene.ts`의 `init()` → `create()` 시 `EventBus.on('battle:start')` 핸들러에서:

```typescript
// 플레이어 유닛 스폰
deck.forEach((unitData, i) => {
  const spawnX = 600 + (i % 3) * 40;
  const spawnY = 450 + Math.floor(i / 3) * 40;
  const unit = UnitFactory.create(this, { ...unitData, position: { x: spawnX, y: spawnY } });
  this.playerUnits.push(unit);
});

// 적 유닛 스폰 (고정 5종, T2 기준)
const enemyTypes: UnitData['type'][] = ['infantry', 'tank', 'infantry', 'air', 'special'];
enemyTypes.forEach((type, i) => {
  const spawnX = 100 + (i % 3) * 40;
  const spawnY = 80 + Math.floor(i / 3) * 40;
  const enemyData: UnitData = { id: `enemy-${i}`, type, tier: 2, ... };
  this.enemyUnits.push(UnitFactory.create(this, enemyData));
});
```

---

## 완료 조건

- [ ] Unit 클래스 인스턴스 정상 생성, 맵에 렌더링
- [ ] 4종 유닛 색상 구분 표시 (보병=파랑, 전차=주황, 공군=청록, 특수=핑크)
- [ ] HP 바 표시 및 피격 시 업데이트 (값 변경 시에만 redraw)
- [ ] `moveTo()` 호출 시 목표 방향으로 이동
- [ ] 원거리 유닛(air/special) Projectile 발사 동작
- [ ] `update()` 루프에 `new` 키워드 없음
- [ ] 티어별 스탯 배율 정상 적용 (T2는 T1의 1.8배)
- [ ] TypeScript strict 통과
