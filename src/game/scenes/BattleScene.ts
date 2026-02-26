import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';
import { ObjectPool } from '../entities/ObjectPool';
import { Unit } from '../entities/Unit';
import { UnitFactory } from '../entities/UnitFactory';
import { AutoAI } from '../systems/AutoAI';
import { CommandSystem } from '../systems/CommandSystem';
import { SkillSystem } from '../systems/SkillSystem';
import type { CapturePoint, UnitData, UnitType } from '@/types';

/**
 * 전투 씬 메인
 * 390×480 전투 맵, 배경 지형, 거점 3개, Object Pool 초기화를 담당한다.
 * Task 4: 유닛 스폰 / Task 5: AutoAI + CommandSystem / Task 6: SkillSystem + 승패 판정
 */
export class BattleScene extends Phaser.Scene {
  /** 거점 데이터 배열 */
  private capturePoints: CapturePoint[] = [];

  /** 투사체 Object Pool (20개 사전 생성) */
  private projectilePool!: ObjectPool;

  /** 플레이어 진영 AutoAI */
  private playerAI!: AutoAI;

  /** 적군 진영 AutoAI */
  private enemyAI!: AutoAI;

  /** 스와이프 명령 시스템 */
  private commandSystem!: CommandSystem;

  /** 스킬 시스템 */
  private skillSystem!: SkillSystem;

  /** 남은 시간 (초) — init 데이터로 오버라이드 가능 */
  private timeLeft = 600;

  /** 최대 전투 시간 (초) — timeElapsed 계산에 사용 */
  private maxTime = 600;

  /** 전투 모드 */
  private mode: 'attack' | 'defense' = 'attack';

  /** HUD 업데이트 throttle (1000ms 간격) */
  private hudTimer = 0;

  /** 전투 종료 처리 여부 — 중복 호출 방지 */
  private battleEnded = false;

  /** 전투 실제 시작 여부 — battle:start 이벤트 수신 + 유닛 스폰 완료 후 true
   * false 상태에서는 승패 판정을 실행하지 않는다. */
  private battleStarted = false;

  // ─── 유닛 배열 (Unit 인스턴스) ──────────────────────────────────────
  /** 아군 유닛 배열 */
  playerUnits: Unit[] = [];

  /** 적군 유닛 배열 */
  enemyUnits: Unit[] = [];

  // ─── 거점 비주얼 오브젝트 맵 (id → Graphics) ────────────────────────
  /** 거점 원형 채우기 Graphics (owner 색상) */
  private cpGraphics = new Map<number, Phaser.GameObjects.Graphics>();

  /** 점령 진행 프로그레스 링 Graphics */
  private cpRings = new Map<number, Phaser.GameObjects.Graphics>();

  /** HUD 타이머 텍스트 오브젝트 */
  private timerText!: Phaser.GameObjects.Text;

  /** HUD 점수 텍스트 오브젝트 */
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  /**
   * 씬 초기화 — 전투 모드와 제한 시간을 외부에서 주입받는다.
   */
  init(data: { mode?: 'attack' | 'defense'; timeLimit?: number }): void {
    this.mode         = data.mode ?? 'attack';
    this.timeLeft     = data.timeLimit ?? 600;
    this.maxTime      = this.timeLeft;
    this.hudTimer      = 0;
    this.battleEnded   = false;
    this.battleStarted = false;
    this.playerUnits   = [];
    this.enemyUnits   = [];
    this.cpGraphics.clear();
    this.cpRings.clear();
  }

  create(): void {
    this.drawBackground();
    this.createCapturePoints();
    this.createHUD();
    this.projectilePool = new ObjectPool(this, 20);

    // AutoAI 초기화 (플레이어/적군 각각 독립 인스턴스)
    this.playerAI = new AutoAI(this.projectilePool, 'player');
    this.enemyAI  = new AutoAI(this.projectilePool, 'enemy');

    // CommandSystem 초기화 — 플레이어 유닛 배열 접근자 주입
    this.commandSystem = new CommandSystem(() => this.playerUnits);

    // SkillSystem 초기화 — 플레이어/적군 유닛 배열 접근자 주입
    this.skillSystem = new SkillSystem(
      this,
      () => this.playerUnits,
      () => this.enemyUnits,
    );

    this.setupEventListeners();

    // 씬 준비 완료 이벤트 발행 — React HUD가 이를 수신
    EventBus.emit('scene:ready', { sceneName: 'BattleScene' });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 배경 드로잉
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 전투 맵 배경을 그린다.
   * 풀(초록) — 전체 배경 / 세로 도로(갈색) / 산(회색) 장애물
   * 모든 배경 요소는 create() 에서 한 번만 그린다 (update 금지).
   */
  private drawBackground(): void {
    // 풀(초록) — 전체 배경 (390×480)
    this.add.rectangle(195, 240, 390, 480, 0x4a7c59).setDepth(0);

    // 세로 도로 (갈색) — x=160~230, 맵 전체 세로
    const road = this.add.graphics().setDepth(1);
    road.fillStyle(0x8b7355, 1);
    road.fillRect(160, 0, 70, 480);

    // 도로 측선 (어두운 갈색)
    road.lineStyle(2, 0x5a4a2a, 0.8);
    road.lineBetween(160, 0, 160, 480);
    road.lineBetween(230, 0, 230, 480);

    // 산(회색) 장애물 — 좌상단
    this.add.rectangle(60, 160, 80, 60, 0x6b6b6b).setDepth(1);
    this.add.text(60, 160, '山', { fontSize: '20px', color: '#999' }).setOrigin(0.5).setDepth(2);

    // 산(회색) 장애물 — 우하단
    this.add.rectangle(320, 320, 80, 60, 0x6b6b6b).setDepth(1);
    this.add.text(320, 320, '山', { fontSize: '20px', color: '#999' }).setOrigin(0.5).setDepth(2);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 거점 생성 및 시각화
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 거점 3개를 생성하고 시각화한다.
   * 각 거점은 원형(채우기) + 외곽선 + 레이블 + 프로그레스 링으로 구성된다.
   */
  private createCapturePoints(): void {
    const defs = [
      { id: 0, x: 195, y: 80,  owner: 'enemy'   as const, label: '적 거점'  },
      { id: 1, x: 195, y: 240, owner: 'neutral' as const, label: '중립 거점' },
      { id: 2, x: 195, y: 400, owner: 'player'  as const, label: '아군 거점' },
    ];

    this.capturePoints = defs.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      owner: d.owner,
      hp: 100,
      captureProgress: 0,
    }));

    defs.forEach((def, i) => {
      const cp = this.capturePoints[i];
      const color = this.ownerColor(cp.owner);

      // ─ 거점 원형 채우기 (owner 색상 변경 시 cpGraphics로 재드로우) ─
      const gfx = this.add.graphics().setDepth(3);
      gfx.fillStyle(color, 0.85);
      gfx.fillCircle(def.x, def.y, 28);
      gfx.lineStyle(3, 0xffffff, 1);
      gfx.strokeCircle(def.x, def.y, 28);
      this.cpGraphics.set(cp.id, gfx);

      // ─ 프로그레스 링 (점령 진행률 arc) ─────────────────────────────
      const ring = this.add.graphics().setDepth(4);
      this.cpRings.set(cp.id, ring);

      // ─ 거점 레이블 텍스트 ────────────────────────────────────────────
      this.add.text(def.x, def.y - 46, def.label, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#00000066',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(5);

      // ─ 거점 ID 텍스트 (중앙) ─────────────────────────────────────────
      this.add.text(def.x, def.y, `P${cp.id + 1}`, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(5);
    });
  }

  /**
   * owner 타입에 따른 색상값 반환
   */
  private ownerColor(owner: CapturePoint['owner']): number {
    switch (owner) {
      case 'player':  return 0x2255dd;
      case 'enemy':   return 0xdd2222;
      case 'neutral': return 0x888888;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // HUD (씬 내부 — 점수/타이머 텍스트)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 맵 상단에 타이머와 점수 텍스트를 생성한다.
   * React 오버레이 HUD가 이를 대체하기 전까지 fallback으로 사용.
   */
  private createHUD(): void {
    this.timerText = this.add.text(10, 10, `${Math.floor(this.timeLeft)}초`, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
    }).setDepth(10);

    this.scoreText = this.add.text(380, 10, '아군: 1 / 적: 1', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000066',
      padding: { x: 6, y: 3 },
    }).setOrigin(1, 0).setDepth(10);
  }

  // ─────────────────────────────────────────────────────────────────────
  // EventBus 리스너
  // ─────────────────────────────────────────────────────────────────────

  /**
   * React → Phaser 방향 이벤트 수신
   */
  private setupEventListeners(): void {
    // 전투 시작 이벤트 (로비에서 덱 편성 완료 후 전송)
    EventBus.on('battle:start', (payload: { deck: UnitData[]; mode: 'attack' | 'defense'; timeLimit: number }) => {
      this.mode      = payload.mode;
      this.timeLeft  = payload.timeLimit;

      // 기존 유닛 정리
      this.playerUnits.forEach((u) => { u.setActive(false); u.setVisible(false); });
      this.enemyUnits.forEach((u)  => { u.setActive(false); u.setVisible(false); });
      this.playerUnits = [];
      this.enemyUnits  = [];

      // 아군 유닛 스폰 (덱 5개, 하단 중앙 근처)
      this.spawnPlayerUnits(payload.deck);

      // 적 유닛 스폰 (고정 5종, T2 기준)
      this.spawnEnemyUnits();

      // 유닛 스폰 완료 후 승패 판정 활성화
      this.battleStarted = true;
    });
  }

  /**
   * 플레이어 유닛 스폰
   * 아군 거점(195, 400) 근처에 5개 유닛을 2열로 배치한다.
   */
  private spawnPlayerUnits(deck: UnitData[]): void {
    // 스폰 위치: 아군 거점 하단 (y=430~460), 가로 간격 40px
    const positions = [
      { x: 115, y: 440 },
      { x: 155, y: 440 },
      { x: 195, y: 440 },
      { x: 235, y: 440 },
      { x: 275, y: 440 },
    ];

    deck.slice(0, 5).forEach((unitData, i) => {
      const pos  = positions[i] ?? { x: 195 + (i - 2) * 40, y: 450 };
      const unit = UnitFactory.create(this, unitData, pos.x, pos.y, 'player');
      this.playerUnits.push(unit);
    });
  }

  /**
   * 적 유닛 스폰 (고정 5종, T2 기준)
   * 적 거점(195, 80) 상단 근처에 2열로 배치한다.
   */
  private spawnEnemyUnits(): void {
    const ENEMY_TYPES: UnitType[] = ['infantry', 'tank', 'infantry', 'air', 'special'];
    const positions = [
      { x: 115, y: 40 },
      { x: 155, y: 40 },
      { x: 195, y: 40 },
      { x: 235, y: 40 },
      { x: 275, y: 40 },
    ];

    ENEMY_TYPES.forEach((type, i) => {
      const pos      = positions[i] ?? { x: 195 + (i - 2) * 40, y: 30 };
      const data     = UnitFactory.makeEnemyData(`enemy-${i}`, type, 2, pos);
      const unit     = UnitFactory.create(this, data, pos.x, pos.y, 'enemy');
      this.enemyUnits.push(unit);
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // update 루프
  // ─────────────────────────────────────────────────────────────────────

  update(_time: number, delta: number): void {
    // 전투 종료 후에는 업데이트 중단
    if (this.battleEnded) return;

    // ─ 타이머 감소 ──────────────────────────────────────────────────────
    this.timeLeft -= delta / 1000;

    // ─ 사망 유닛 배열 정리 (isAlive === false 인 유닛 제거) ──────────────
    // Unit.die()가 setActive(false)를 호출하므로 배열에서도 제거한다.
    this.playerUnits = this.playerUnits.filter((u) => u.isAlive);
    this.enemyUnits  = this.enemyUnits.filter((u) => u.isAlive);

    // ─ AutoAI 업데이트 ────────────────────────────────────────────────────
    // 플레이어/적군 각각의 AI가 매 프레임 행동을 결정한다.
    this.playerAI.update(this.playerUnits, this.enemyUnits,  this.capturePoints, delta);
    this.enemyAI.update(this.enemyUnits,  this.playerUnits, this.capturePoints, delta);

    // ─ 거점 점령 진행 (매 프레임) ────────────────────────────────────────
    this.updateCaptureProgress(delta);

    // ─ 스킬 시스템 쿨타임 업데이트 ───────────────────────────────────────
    this.skillSystem.update(delta);

    // ─ 승패 즉시 판정 (매 프레임 체크) ──────────────────────────────────
    this.checkWinCondition();
    if (this.battleEnded) return;  // endBattle()에서 플래그 설정 시 즉시 중단

    // ─ HUD 업데이트 (1초 간격 throttle) ─────────────────────────────────
    this.hudTimer += delta;
    if (this.hudTimer >= 1000) {
      this.hudTimer = 0;
      const tl = Math.max(0, Math.floor(this.timeLeft));
      const pc = this.playerUnits.length;  // 생존 아군 유닛 수
      const ec = this.enemyUnits.length;   // 생존 적 유닛 수

      // 씬 내부 HUD 텍스트 갱신
      this.timerText.setText(`${tl}초`);
      this.scoreText.setText(`아군: ${pc} / 적: ${ec}`);

      // React HUD 오버레이에 이벤트 발행 (스킬 쿨타임 포함)
      EventBus.emit('battle:hud', {
        timeLeft: tl,
        playerCount: pc,
        enemyCount: ec,
        skillCooldownRatios: this.skillSystem.getCooldownRatios(),
      });
    }

    // ─ 시간 초과 처리 ────────────────────────────────────────────────────
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.handleTimeUp();
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // 거점 점령 로직
  // ─────────────────────────────────────────────────────────────────────

  /**
   * 거점 점령 진행 메커니즘 (2단계: 해체 → 재점령)
   *
   * 규칙:
   *   1단계(해체): 현 소유자 아닌 진영의 유닛만 반경 내 있을 때 → progress 감소
   *               progress 0 도달 → owner = 'neutral' 리셋
   *   2단계(점령): 중립 거점 + 한 진영 유닛만 있을 때 → progress 증가
   *               progress 100 도달 → owner = 해당 진영
   *   혼재 또는 아무도 없을 때: 변화 없음
   */
  private updateCaptureProgress(delta: number): void {
    const CAPTURE_RADIUS = 50;
    const CAPTURE_RATE   = 20;  // progress/초

    for (const cp of this.capturePoints) {
      const playerNear = this.playerUnits.filter(
        (u) => u.isAlive && Math.hypot(u.x - cp.x, u.y - cp.y) <= CAPTURE_RADIUS
      ).length;
      const enemyNear = this.enemyUnits.filter(
        (u) => u.isAlive && Math.hypot(u.x - cp.x, u.y - cp.y) <= CAPTURE_RADIUS
      ).length;

      const prevProgress = cp.captureProgress;

      if (playerNear > 0 && enemyNear === 0) {
        if (cp.owner === 'neutral') {
          // 2단계: 중립 → 아군 점령
          cp.captureProgress = Math.min(100, cp.captureProgress + CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress >= 100) {
            cp.owner = 'player';
            cp.captureProgress = 100;
            this.redrawCapturePoint(cp);
          }
        } else if (cp.owner === 'enemy') {
          // 1단계: 적군 거점 해체
          cp.captureProgress = Math.max(0, cp.captureProgress - CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress <= 0) {
            cp.owner = 'neutral';
            cp.captureProgress = 0;
            this.redrawCapturePoint(cp);
          }
        }
        // cp.owner === 'player': 이미 아군 — 변화 없음
      } else if (enemyNear > 0 && playerNear === 0) {
        if (cp.owner === 'neutral') {
          // 2단계: 중립 → 적군 점령
          cp.captureProgress = Math.min(100, cp.captureProgress + CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress >= 100) {
            cp.owner = 'enemy';
            cp.captureProgress = 100;
            this.redrawCapturePoint(cp);
          }
        } else if (cp.owner === 'player') {
          // 1단계: 아군 거점 해체
          cp.captureProgress = Math.max(0, cp.captureProgress - CAPTURE_RATE * (delta / 1000));
          if (cp.captureProgress <= 0) {
            cp.owner = 'neutral';
            cp.captureProgress = 0;
            this.redrawCapturePoint(cp);
          }
        }
        // cp.owner === 'enemy': 이미 적군 — 변화 없음
      }
      // 혼재 또는 아무도 없으면 변화 없음

      // 프로그레스 링 업데이트 (값이 변했을 때만 재드로우)
      if (cp.captureProgress !== prevProgress) {
        this.updateCaptureRing(cp);
      }
    }
  }

  /**
   * 거점 owner 변경 시 원형 색상 재드로우
   */
  private redrawCapturePoint(cp: CapturePoint): void {
    const gfx = this.cpGraphics.get(cp.id);
    if (!gfx) return;

    const color = this.ownerColor(cp.owner);
    gfx.clear();
    gfx.fillStyle(color, 0.85);
    gfx.fillCircle(cp.x, cp.y, 28);
    gfx.lineStyle(3, 0xffffff, 1);
    gfx.strokeCircle(cp.x, cp.y, 28);
  }

  /**
   * 점령 진행 프로그레스 링 업데이트
   * 0% = arc 없음, 100% = 완전한 원 (arc 360도)
   */
  private updateCaptureRing(cp: CapturePoint): void {
    const ring = this.cpRings.get(cp.id);
    if (!ring) return;

    ring.clear();
    if (cp.captureProgress <= 0) return;

    // -90도(12시 방향)에서 시작, 진행률에 따라 시계 방향으로 arc
    const startAngle = Phaser.Math.DegToRad(-90);
    const endAngle   = Phaser.Math.DegToRad(cp.captureProgress * 3.6 - 90);

    ring.lineStyle(4, 0xffdd00, 1);
    ring.beginPath();
    ring.arc(cp.x, cp.y, 36, startAngle, endAngle, false);
    ring.strokePath();
  }

  // ─────────────────────────────────────────────────────────────────────
  // 점수 계산 & 승패 판정
  // ─────────────────────────────────────────────────────────────────────

  /** 아군이 점령한 거점 수 */
  private countPlayerPoints(): number {
    return this.capturePoints.filter((p) => p.owner === 'player').length;
  }

  /** 적군이 점령한 거점 수 */
  private countEnemyPoints(): number {
    return this.capturePoints.filter((p) => p.owner === 'enemy').length;
  }

  /**
   * 즉시 승패 판정 — 매 프레임 update()에서 호출
   *
   * 공격 모드 승리 조건 (OR):
   *   - 적 유닛 전멸
   *   - 아군 거점 2개 이상 점령
   * 공격 모드 패배 조건:
   *   - 아군 유닛 전멸
   *
   * 방어 모드 패배 조건:
   *   - 아군 거점 0개 (모두 빼앗김)
   *   - 아군 유닛 전멸
   * 방어 모드 승리: 시간 초과까지 버티면 handleTimeUp()에서 처리
   */
  private checkWinCondition(): void {
    // 전투가 실제로 시작(유닛 스폰 완료)되기 전에는 판정하지 않는다
    if (!this.battleStarted) return;

    const playerAlive = this.playerUnits.length;
    const enemyAlive  = this.enemyUnits.length;
    const playerCPs   = this.countPlayerPoints();

    if (this.mode === 'attack') {
      // 승리 조건 (OR)
      if (enemyAlive === 0 || playerCPs >= 2) {
        this.endBattle('win');
        return;
      }
      // 패배 조건
      if (playerAlive === 0) {
        this.endBattle('lose');
      }
    } else {
      // 방어 모드 패배 조건
      if (playerCPs === 0 || playerAlive === 0) {
        this.endBattle('lose');
      }
      // 방어 모드 승리는 handleTimeUp()에서 처리
    }
  }

  /**
   * 전투 종료 처리 — 승/패 결과를 React에 전달하고 씬을 중단한다.
   * battleEnded 플래그로 중복 호출을 방지한다.
   */
  private endBattle(result: 'win' | 'lose'): void {
    if (this.battleEnded) return;
    this.battleEnded = true;

    const survivalCount = this.playerUnits.length;
    const timeElapsed   = this.maxTime - Math.max(0, this.timeLeft);
    const resourceReward = result === 'win' ? 200 + survivalCount * 20 : 50;
    const fameReward     = result === 'win' ? 100 + survivalCount * 10 : 10;

    EventBus.emit('battle:result', {
      result,
      mode: this.mode,
      survivalCount,
      timeElapsed,
      resourceReward,
      fameReward,
    });

    // 시스템 정리
    this.commandSystem.destroy();
    this.skillSystem.destroy();

    // 씬 루프 중단 (화면 전환은 React가 담당)
    this.scene.pause();
  }

  /**
   * 시간 초과 처리
   * 공격 모드: 거점 수 비교로 승패 결정
   * 방어 모드: 거점을 1개라도 유지했으면 승리
   */
  private handleTimeUp(): void {
    if (!this.battleStarted || this.battleEnded) return;

    const playerCPs = this.countPlayerPoints();
    const enemyCPs  = this.countEnemyPoints();

    let result: 'win' | 'lose';
    if (this.mode === 'attack') {
      result = playerCPs > enemyCPs ? 'win' : 'lose';
    } else {
      // 방어 모드: 거점을 하나라도 지키면 승리
      result = playerCPs >= 1 ? 'win' : 'lose';
    }

    this.endBattle(result);
  }

  // ─────────────────────────────────────────────────────────────────────
  // 외부 접근자 (Task 4~6에서 사용)
  // ─────────────────────────────────────────────────────────────────────

  /** 거점 데이터 배열 (읽기 전용 참조) */
  getCapturePoints(): CapturePoint[] {
    return this.capturePoints;
  }

  /** 투사체 풀 반환 (Unit에서 발사 시 사용) */
  getProjectilePool(): ObjectPool {
    return this.projectilePool;
  }
}
