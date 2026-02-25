# Task 3 — Phaser BattleScene 기본

> 담당 에이전트: `scene-agent`
> 의존성: **Task 1 완료 후** 착수 (Game.ts, EventBus.ts, types 필요)
> 병렬 착수 가능: Task 2 (독립적)

---

## 목표

800×600 전투 맵을 Phaser로 구현한다.
배경(풀/길/산), 거점 3개, Object Pool(유닛 20개)을 포함한 전투 씬 기반을 완성한다.

> 비주얼 상세 (컬러, 지형 좌표, 거점 구성요소, 파티클 규칙):
> **`docs/design.md` 섹션 1~2, 7** 참조

---

## 생성할 파일 목록

```
src/game/
├── scenes/
│   ├── LoadingScene.ts             ← 에셋 로딩 + BattleScene 전환
│   └── BattleScene.ts              ← 전투 씬 메인
└── entities/
    └── ObjectPool.ts               ← 범용 Object Pool (Unit, Projectile 재사용)
```

---

## 맵 레이아웃 (800×600)

```
┌─────────────────────────────────────────┐ y=0
│  [적 거점 P1]  산(장애물)   하늘(공군)  │
│     (x=150,y=100)                        │
│  풀  ─────  길(중앙 도로)  ─────  풀    │
│             [중립 거점 P2]               │
│              (x=400,y=300)               │
│  산(장애물)             풀               │
│           [아군 거점 P3]                 │
│            (x=650,y=500)                 │
└─────────────────────────────────────────┘ y=600
  x=0                                 x=800
```

---

## 구현 상세

### src/game/scenes/LoadingScene.ts

```typescript
import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';

/**
 * 에셋 로딩 씬
 * 로딩 완료 후 BattleScene으로 전환하며 EventBus로 React에 알린다.
 */
export class LoadingScene extends Phaser.Scene {
  constructor() { super('LoadingScene'); }

  preload(): void {
    // Placeholder 텍스처 생성 (실제 스프라이트 없어도 동작)
    // 64×64 색상 블록으로 각 유닛 타입 구분
    this.load.on('complete', () => {
      EventBus.emit('scene:ready', { sceneName: 'LoadingScene' });
    });
  }

  create(): void {
    this.scene.start('BattleScene');
  }
}
```

### src/game/scenes/BattleScene.ts — 핵심 구현

```typescript
import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { ObjectPool } from '../entities/ObjectPool';
import type { CapturePoint, UnitData } from '@/types';

/**
 * 전투 씬 메인
 * 맵 렌더링, 거점 관리, Object Pool 초기화를 담당한다.
 */
export class BattleScene extends Phaser.Scene {
  private capturePoints: CapturePoint[] = [];
  private unitPool!: ObjectPool;
  private timeLeft = 600;   // 초 (init 데이터로 오버라이드)
  private mode: 'attack' | 'defense' = 'attack';

  constructor() { super('BattleScene'); }

  init(data: { mode?: 'attack' | 'defense'; timeLimit?: number }): void {
    this.mode = data.mode ?? 'attack';
    this.timeLeft = data.timeLimit ?? 600;
  }

  create(): void {
    this.drawBackground();
    this.createCapturePoints();
    this.unitPool = new ObjectPool(this, 20);
    this.setupEventListeners();
    EventBus.emit('scene:ready', { sceneName: 'BattleScene' });
  }

  private drawBackground(): void {
    // 풀 (초록) — 전체 배경
    this.add.rectangle(400, 300, 800, 600, 0x4a7c59);
    // 중앙 길 (갈색) — 대각선 방향
    const road = this.add.graphics();
    road.fillStyle(0x8b7355);
    road.fillRect(0, 250, 800, 100);  // 가로 도로
    // 산 (회색) — 장애물 영역
    this.add.rectangle(200, 150, 120, 80, 0x6b6b6b);
    this.add.rectangle(600, 450, 120, 80, 0x6b6b6b);
  }

  private createCapturePoints(): void {
    const points = [
      { id: 0, x: 150, y: 100, owner: 'enemy'   as const },
      { id: 1, x: 400, y: 300, owner: 'neutral' as const },
      { id: 2, x: 650, y: 500, owner: 'player'  as const },
    ];

    this.capturePoints = points.map((p) => ({
      ...p,
      hp: 100,
      captureProgress: 0,
    }));

    // 거점 시각화 (원형 + 색상 코딩)
    this.capturePoints.forEach((cp) => {
      const color = cp.owner === 'player' ? 0x4488ff
                  : cp.owner === 'enemy'  ? 0xff4444
                  :                         0xaaaaaa;
      this.add.circle(cp.x, cp.y, 30, color, 0.8)
        .setStrokeStyle(3, 0xffffff);
      this.add.text(cp.x, cp.y, `P${cp.id + 1}`, {
        fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5);
    });
  }

  private setupEventListeners(): void {
    // React에서 전투 시작 이벤트 수신
    EventBus.on('battle:start', ({ deck, mode, timeLimit }) => {
      this.mode = mode;
      this.timeLeft = timeLimit;
      // Task 4에서 실제 유닛 스폰 구현
    });
  }

  update(time: number, delta: number): void {
    // 타이머 업데이트 (1000ms 단위)
    this.timeLeft -= delta / 1000;

    // HUD 업데이트 이벤트 (매 초)
    if (Math.floor(this.timeLeft) % 1 === 0) {
      EventBus.emit('battle:hud', {
        timeLeft: Math.max(0, Math.floor(this.timeLeft)),
        playerScore: this.countPlayerPoints(),
        enemyScore: this.countEnemyPoints(),
      });
    }

    // 시간 초과 처리
    if (this.timeLeft <= 0) this.handleTimeUp();
  }

  private countPlayerPoints(): number {
    return this.capturePoints.filter((p) => p.owner === 'player').length;
  }
  private countEnemyPoints(): number {
    return this.capturePoints.filter((p) => p.owner === 'enemy').length;
  }

  private handleTimeUp(): void {
    const playerScore = this.countPlayerPoints();
    const enemyScore  = this.countEnemyPoints();
    const result = playerScore > enemyScore ? 'win' : 'lose';
    EventBus.emit('battle:result', {
      result,
      mode: this.mode,
      survivalCount: 0,
      timeElapsed: this.mode === 'attack' ? 600 - this.timeLeft : this.timeLeft,
      resourceReward: result === 'win' ? 200 : 50,
      fameReward: result === 'win' ? 100 : 10,
    });
  }
}
```

### src/game/entities/ObjectPool.ts

```typescript
import Phaser from 'phaser';

/**
 * 범용 Object Pool
 * update() 루프 내 new 생성을 방지하기 위해 미리 객체를 생성해 둔다.
 */
export class ObjectPool {
  private pool: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene, size: number) {
    this.pool = scene.add.group({
      maxSize: size,
      runChildUpdate: true,
    });
  }

  get(): Phaser.GameObjects.GameObject | null {
    return this.pool.getFirstDead(false) ?? null;
  }

  release(obj: Phaser.GameObjects.GameObject): void {
    this.pool.killAndHide(obj);
  }

  getPool(): Phaser.GameObjects.Group {
    return this.pool;
  }
}
```

---

## 완료 조건

- [ ] `npm run dev` → 800×600 맵 렌더링 확인
- [ ] 배경: 풀(초록) + 도로(갈색) + 산(회색) 구분 표시
- [ ] 거점 3개 원형 표시 (적=빨강, 중립=회색, 아군=파랑)
- [ ] Object Pool 20개 초기화 완료 (콘솔 오류 없음)
- [ ] `EventBus.emit('scene:ready')` 정상 발행
- [ ] `EventBus.emit('battle:hud')` 타이머 업데이트 확인
- [ ] `update()` 루프에 `new` 키워드 없음
