import Phaser from 'phaser';
import { EventBus } from '../core/EventBus';

/**
 * 로딩 씬
 * 전투 씬에 필요한 스프라이트 시트와 placeholder 텍스처를 모두 로드한 뒤
 * BattleScene으로 전환한다.
 *
 * 스프라이트 로드 전략:
 *   1. 실제 JPEG 스프라이트 시트(4×4 그리드, 256×256 프레임)가 있으면 로드
 *   2. 로드 실패 시 generateTexture() placeholder로 자동 대체 (fallback)
 */
export class LoadingScene extends Phaser.Scene {
  /** 로드 실패한 텍스처 키 목록 (fallback 생성 대상) */
  private failedKeys = new Set<string>();

  constructor() {
    super({ key: 'LoadingScene' });
  }

  preload(): void {
    // ─── 스프라이트 시트 로드 (실제 파일 존재 시) ───────────────────────
    const base = import.meta.env.BASE_URL;
    const UNIT_TYPES = ['infantry', 'tank', 'air', 'special'] as const;
    const DIRECTIONS = ['E', 'NE', 'N', 'SE', 'S'] as const;
    // W / NW / SW 방향은 Phaser flipX 처리 — 별도 파일 없음

    UNIT_TYPES.forEach((type) => {
      DIRECTIONS.forEach((dir) => {
        const key = `${type}_${dir}`;
        this.load.spritesheet(
          key,
          `${base}assets/units/${type}/${type}_${dir}.jpeg`,
          { frameWidth: 256, frameHeight: 256 }
        );
      });
    });

    // 로드 실패 이벤트 → fallback 목록에 추가
    this.load.on(
      'loaderror',
      (file: Phaser.Loader.File) => {
        this.failedKeys.add(file.key);
      }
    );

    // 로딩 진행 바 표시 (간단한 텍스트)
    const loadingText = this.add.text(195, 240, '로딩 중...', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      loadingText.setText(`로딩 중... ${Math.round(value * 100)}%`);
    });
  }

  create(): void {
    // ─── Placeholder 텍스처 생성 ──────────────────────────────────────────
    // 로드 실패한 스프라이트 키는 여기서 단색 원형으로 대체한다.
    this.createPlaceholderTextures();

    // ─── 애니메이션 등록 ─────────────────────────────────────────────────
    this.registerAnimations();

    // ─── 씬 전환 ─────────────────────────────────────────────────────────
    EventBus.emit('scene:ready', { sceneName: 'LoadingScene' });
    this.scene.start('BattleScene');
  }

  /**
   * generateTexture()로 placeholder 텍스처를 생성한다.
   * 실제 PNG/JPEG 교체 시 이 메서드의 해당 분기만 제거하면 된다.
   */
  private createPlaceholderTextures(): void {
    // Phaser 3.80+에서 make.graphics는 씬에 추가되지 않는 Graphics 객체를 생성한다.
    // add: false 옵션은 더 이상 지원되지 않으므로 add.graphics()를 사용 후 수동으로 씬에서 제거한다.
    const g = this.add.graphics();

    // ─── 아군 유닛 텍스처 ───────────────────────────────────────────────
    // 로드에 성공한 스프라이트는 덮어쓰지 않는다.
    const unitColors: Record<string, number> = {
      unit_infantry: 0x4488ff,
      unit_tank: 0xffaa00,
      unit_air: 0x44ffcc,
      unit_special: 0xff44aa,
    };
    Object.entries(unitColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        g.clear()
          .fillStyle(color)
          .fillCircle(16, 16, 14)
          .lineStyle(2, 0xffffff)
          .strokeCircle(16, 16, 14)
          .generateTexture(key, 32, 32);
      }
    });

    // ─── 적군 유닛 텍스처 (붉은 외곽선) ────────────────────────────────
    const enemyColors: Record<string, number> = {
      enemy_infantry: 0x4488ff,
      enemy_tank: 0xffaa00,
      enemy_air: 0x44ffcc,
      enemy_special: 0xff44aa,
    };
    Object.entries(enemyColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        g.clear()
          .fillStyle(color)
          .fillCircle(16, 16, 14)
          .lineStyle(3, 0xff2222)
          .strokeCircle(16, 16, 14)
          .generateTexture(key, 32, 32);
      }
    });

    // ─── 방향별 스프라이트 fallback (로드 실패한 키만) ──────────────────
    const UNIT_TYPES = ['infantry', 'tank', 'air', 'special'] as const;
    const DIRECTIONS = ['E', 'NE', 'N', 'SE', 'S'] as const;
    const spriteUnitColors: Record<string, number> = {
      infantry: 0x4488ff,
      tank: 0xffaa00,
      air: 0x44ffcc,
      special: 0xff44aa,
    };
    UNIT_TYPES.forEach((type) => {
      DIRECTIONS.forEach((dir) => {
        const key = `${type}_${dir}`;
        if (this.failedKeys.has(key) || !this.textures.exists(key)) {
          // 4×4 그리드 placeholder (1024×1024, 256×256 프레임)
          const color = spriteUnitColors[type];
          const canvas = this.textures.createCanvas(key, 1024, 1024);
          if (canvas) {
            const ctx = canvas.getContext();
            for (let row = 0; row < 4; row++) {
              for (let col = 0; col < 4; col++) {
                const fx = col * 256 + 128;
                const fy = row * 256 + 128;
                ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
                ctx.beginPath();
                ctx.arc(fx, fy, 96, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 4;
                ctx.stroke();
                // 방향 레이블
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 32px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${type[0].toUpperCase()}${dir}`, fx, fy);
              }
            }
            canvas.refresh();
          }
        }
      });
    });

    // ─── 투사체 텍스처 ───────────────────────────────────────────────────
    if (!this.textures.exists('projectile_bullet')) {
      g.clear()
        .fillStyle(0xffff00)
        .fillCircle(4, 4, 4)
        .generateTexture('projectile_bullet', 8, 8);
    }

    g.destroy();
  }

  /**
   * 4종 유닛 × 5방향 × 4애니메이션 = 80개 애니메이션을 등록한다.
   * 스프라이트 시트가 없으면 단색 placeholder로 대체되어 있으므로
   * 애니메이션은 항상 등록 가능하다.
   */
  private registerAnimations(): void {
    const UNIT_TYPES = ['infantry', 'tank', 'air', 'special'] as const;
    const DIRECTIONS = ['E', 'NE', 'N', 'SE', 'S'] as const;

    // 4×4 스프라이트 시트 기준 프레임 인덱스
    const ANIM_DEFS = [
      { suffix: 'idle',   frames: [0, 1, 2, 3],     frameRate: 6,  repeat: -1 },
      { suffix: 'walk',   frames: [4, 5, 6, 7],     frameRate: 8,  repeat: -1 },
      { suffix: 'attack', frames: [8, 9, 10, 11],   frameRate: 10, repeat: 0  },
      { suffix: 'death',  frames: [12, 13, 14, 15], frameRate: 6,  repeat: 0  },
    ] as const;

    UNIT_TYPES.forEach((type) => {
      DIRECTIONS.forEach((dir) => {
        const textureKey = `${type}_${dir}`;
        // 텍스처가 없으면 애니메이션 등록 스킵
        if (!this.textures.exists(textureKey)) return;

        ANIM_DEFS.forEach(({ suffix, frames, frameRate, repeat }) => {
          const animKey = `${textureKey}_${suffix}`;
          // 중복 등록 방지
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(textureKey, {
                frames: frames as unknown as number[],
              }),
              frameRate,
              repeat,
            });
          }
        });
      });
    });
  }
}
