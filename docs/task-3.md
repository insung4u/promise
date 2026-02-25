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
    // Placeholder 텍스처 — PNG 파일 없이 런타임 생성 (design.md 섹션 11 참조)
    this.createPlaceholderTextures();
  }

  /**
   * generateTexture()로 모든 placeholder 텍스처를 생성한다.
   * 실제 PNG 교체 시 이 메서드만 제거하면 된다.
   */
  private createPlaceholderTextures(): void {
    const g = this.make.graphics({ add: false });

    // 유닛 텍스처 (아군)
    const unitColors: Record<string, number> = {
      unit_infantry: 0x4488ff,
      unit_tank:     0xffaa00,
      unit_air:      0x44ffcc,
      unit_special:  0xff44aa,
    };
    Object.entries(unitColors).forEach(([key, color]) => {
      g.clear().fillStyle(color).fillCircle(16, 16, 14)
       .lineStyle(2, 0xffffff).strokeCircle(16, 16, 14)
       .generateTexture(key, 32, 32);
    });

    // 적군 텍스처 (붉은 외곽선)
    const enemyColors: Record<string, number> = {
      enemy_infantry: 0x4488ff,
      enemy_tank:     0xffaa00,
      enemy_air:      0x44ffcc,
      enemy_special:  0xff44aa,
    };
    Object.entries(enemyColors).forEach(([key, color]) => {
      g.clear().fillStyle(color).fillCircle(16, 16, 14)
       .lineStyle(3, 0xff2222).strokeCircle(16, 16, 14)
       .generateTexture(key, 32, 32);
    });

    // 투사체
    g.clear().fillStyle(0xffff00).fillCircle(4, 4, 4)
     .generateTexture('projectile_bullet', 8, 8);

    g.destroy();   // 재사용 Graphics 오브젝트 제거

    EventBus.emit('scene:ready', { sceneName: 'LoadingScene' });
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
 * 전투 유닛의 최소 인터페이스
 * Task 3에서는 Unit 클래스가 아직 없으므로, 거점 점령 판정에 필요한 최소 속성만 정의한다.
 * Task 4에서 Unit 클래스가 이 인터페이스를 만족하도록 구현한다.
 */
interface BattleUnit {
  x: number;
  y: number;
  isAlive: boolean;
}

/**
 * 전투 씬 메인
 * 맵 렌더링, 거점 관리, Object Pool 초기화를 담당한다.
 */
export class BattleScene extends Phaser.Scene {
  private capturePoints: CapturePoint[] = [];
  private unitPool!: ObjectPool;
  private timeLeft = 600;      // 초 (init 데이터로 오버라이드)
  private maxTime  = 600;      // 최대 시간 (결과 계산용)
  private mode: 'attack' | 'defense' = 'attack';
  private hudTimer = 0;        // HUD 이벤트 throttle (1초 간격)

  // Task 4에서 Unit 클래스 인스턴스로 채워짐 — BattleUnit 인터페이스만 요구
  playerUnits: BattleUnit[] = [];
  enemyUnits:  BattleUnit[] = [];

  // 거점 비주얼 오브젝트 (id → Graphics)
  private cpGraphics = new Map<number, Phaser.GameObjects.Graphics>();
  private cpRings    = new Map<number, Phaser.GameObjects.Graphics>();

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

  update(_time: number, delta: number): void {
    // 타이머 업데이트
    this.timeLeft -= delta / 1000;

    // 거점 점령 진행 업데이트 (매 프레임)
    // Task 4에서 playerUnits/enemyUnits 배열이 채워진 후 동작
    this.updateCaptureProgress(delta);

    // HUD 업데이트 (매 초)
    this.hudTimer += delta;
    if (this.hudTimer >= 1000) {
      this.hudTimer = 0;
      EventBus.emit('battle:hud', {
        timeLeft: Math.max(0, Math.floor(this.timeLeft)),
        playerScore: this.countPlayerPoints(),
        enemyScore: this.countEnemyPoints(),
      });
    }

    if (this.timeLeft <= 0) this.handleTimeUp();
  }

  /**
   * 거점 점령 진행 메커니즘 (2단계: 해체 → 재점령)
   * 거점 반경(50px) 내 아군/적군 유닛 수에 따라 captureProgress 증감.
   *
   * 규칙:
   *   1단계 (해체): 거점 소유자가 아닌 진영의 유닛만 있을 때 → progress 감소
   *                 progress가 0 도달 → owner를 'neutral'로 리셋
   *   2단계 (점령): 중립 거점 + 한쪽 진영 유닛만 있을 때 → progress 증가
   *                 progress가 100 도달 → owner를 해당 진영으로 변경
   *   혼재 또는 아무도 없을 때: 변화 없음
   */
  private updateCaptureProgress(delta: number): void {
    const CAPTURE_RADIUS = 50;
    const CAPTURE_RATE   = 20;   // progress/초

    for (const cp of this.capturePoints) {
      const playerNear = this.playerUnits.filter(
        (u) => u.isAlive && Math.hypot(u.x - cp.x, u.y - cp.y) <= CAPTURE_RADIUS
      ).length;
      const enemyNear = this.enemyUnits.filter(
        (u) => u.isAlive && Math.hypot(u.x - cp.x, u.y - cp.y) <= CAPTURE_RADIUS
      ).length;

      const prevProgress = cp.captureProgress;

      if (playerNear > 0 && enemyNear === 0) {
        if (cp.owner === 'player') {
          // 이미 아군 거점 — 변화 없음 (방어 중)
        } else if (cp.owner === 'neutral') {
          // 2단계: 중립 거점 → 아군 점령 진행 (0→100)
          cp.captureProgress = Math.min(100, cp.captureProgress + CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress >= 100) {
            cp.owner = 'player';
            cp.captureProgress = 100;
            this.redrawCapturePoint(cp);
          }
        } else {
          // 1단계: 적군 거점 → 해체 (progress 감소)
          cp.captureProgress = Math.max(0, cp.captureProgress - CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress <= 0) {
            cp.owner = 'neutral';
            cp.captureProgress = 0;
            this.redrawCapturePoint(cp);
          }
        }
      } else if (enemyNear > 0 && playerNear === 0) {
        if (cp.owner === 'enemy') {
          // 이미 적군 거점 — 변화 없음 (방어 중)
        } else if (cp.owner === 'neutral') {
          // 2단계: 중립 거점 → 적군 점령 진행 (0→100)
          cp.captureProgress = Math.min(100, cp.captureProgress + CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress >= 100) {
            cp.owner = 'enemy';
            cp.captureProgress = 100;
            this.redrawCapturePoint(cp);
          }
        } else {
          // 1단계: 아군 거점 → 해체 (progress 감소)
          cp.captureProgress = Math.max(0, cp.captureProgress - CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress <= 0) {
            cp.owner = 'neutral';
            cp.captureProgress = 0;
            this.redrawCapturePoint(cp);
          }
        }
      }
      // 혼재 또는 아무도 없으면 변화 없음

      // 프로그레스 링 업데이트 (값 변경 시에만)
      if (cp.captureProgress !== prevProgress) {
        this.updateCaptureRing(cp);
      }
    }
  }

  // 거점 owner 변경 시 색상 재드로우
  private redrawCapturePoint(cp: CapturePoint): void {
    const color = cp.owner === 'player' ? 0x2255dd
                : cp.owner === 'enemy'  ? 0xdd2222
                :                         0x888888;
    // 해당 거점 Graphics 오브젝트를 Map으로 관리 후 업데이트
    const gfx = this.cpGraphics.get(cp.id);
    if (gfx) {
      gfx.clear()
         .fillStyle(color, 0.85).fillCircle(0, 0, 35)
         .lineStyle(2, 0xffffff).strokeCircle(0, 0, 38);
    }
  }

  // 점령 프로그레스 링 (0~360도 arc)
  private updateCaptureRing(cp: CapturePoint): void {
    const ring = this.cpRings.get(cp.id);
    if (!ring) return;
    const angle = Phaser.Math.DegToRad(cp.captureProgress * 3.6 - 90);  // 0%=-90도, 100%=270도
    ring.clear()
        .lineStyle(4, 0xffdd00)
        .beginPath()
        .arc(0, 0, 42, Phaser.Math.DegToRad(-90), angle, false)
        .strokePath();
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
- [ ] Placeholder 텍스처 전부 생성 완료, 404 에셋 에러 0개
- [ ] Object Pool 20개 초기화 완료 (콘솔 오류 없음)
- [ ] `EventBus.emit('scene:ready')` 정상 발행
- [ ] `EventBus.emit('battle:hud')` 타이머 1초 간격 업데이트 확인
- [ ] 거점 반경(50px) 내 유닛 진입 시 `captureProgress` 증가 확인
- [ ] `captureProgress` 100% 도달 시 거점 owner 변경 + 색상 변경 확인
- [ ] 프로그레스 링(arc) 진행률에 따라 시각 업데이트 확인
- [ ] `update()` 루프에 `new` 키워드 없음
