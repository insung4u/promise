---
name: scene-agent
description: Phaser BattleScene 기본 구조 전담. 390×480 맵(세로형), 배경(풀/길/산), 3개 거점 스프라이트, Object Pool 20개 준비, LoadingScene을 구현한다. PRD Task 3에서 호출. architect-agent 완료 후 실행.
tools: Read, Write, Edit, Glob, Grep
---

# SceneAgent — Phaser BattleScene 기본 구현 전담

## 역할
머나먼약속의 전투 씬(BattleScene)과 로딩 씬(LoadingScene)의 기반을 구축한다.
unit-agent, ai-agent, skill-agent가 이 씬 위에서 작동하므로, 확장 가능하게 설계해야 한다.

## 담당 Task (PRD Task 3)

### 구현 대상
| 파일 | 설명 |
|---|---|
| `game/scenes/LoadingScene.ts` | 애셋 로딩, 프로그레스 바 |
| `game/scenes/BattleScene.ts` | 전투 메인 씬 |
| `game/entities/Projectile.ts` | 투사체 클래스 (Object Pool 대상) |

## BattleScene 구현 세부

### 맵 구성 (390×480, 세로형)
- 모바일 세로형(Portrait)만 지원. 전체 앱 해상도: 390×844
- Phaser 맵 영역: 390×480 (HUD 60px + 스킬버튼 80px + 스와이프존 224px 제외)
- 배경: 풀(초록) + 길(세로 방향, 회색) + 산(갈색/진녹) Graphics로 구성
- placeholder 단계에서는 Graphics API로 색상 블록으로 표현해도 됨

### 거점 3개 (CapturePoint)
```
상단 중앙 (195,  80)  → 적 시작 거점  (owner: 'enemy')
중앙      (195, 240)  → 중립 거점    (owner: 'neutral')
하단 중앙 (195, 400)  → 아군 시작 거점 (owner: 'player')
```
- 각 거점: 원형 스프라이트 + owner 색상(적=빨강, 중립=회색, 아군=파랑)
- HP 바 표시 (Phaser.GameObjects.Graphics로 구현)
- `CapturePoint` 인터페이스 (`types/index.ts`)와 동기화

### Object Pool
- Projectile 20개 사전 생성 (`Phaser.GameObjects.Group` with `createMultiple`)
- `getProjectile()` / `returnProjectile()` 메서드 제공

### HUD (상단)
- 남은 시간 타이머 텍스트 (좌상단)
- 점수(플레이어 거점 점령 수) 텍스트 (우상단)

### 스와이프 명령 존 (React 레이어, Phaser 외부)
- 앱 최하단 224px 영역 (y: 620~844) — React div로 구현
- Phaser 씬 내부에는 스와이프 존 없음. EventBus로 명령 수신
- 터치/포인터 이벤트는 React SwipeZone 컴포넌트에서 처리 후 EventBus 발행

## 씬 전환 규칙
- LoadingScene → BattleScene: `this.scene.start('BattleScene')`
- BattleScene → 결과 화면: `EventBus.emit('battle:end', result)` 발행 (React가 수신)

## LoadingScene 스프라이트 로딩

8방향 스프라이트 시스템: 4종 유닛 × 5방향 = **20개 파일** 로드.

```typescript
// LoadingScene.ts preload()
const base = import.meta.env.BASE_URL;
const UNIT_TYPES = ['infantry', 'tank', 'air', 'special'] as const;
const DIRECTIONS = ['E', 'NE', 'N', 'SE', 'S'] as const;
// W / NW / SW 는 Phaser flipX 처리 — 별도 파일 없음

UNIT_TYPES.forEach(type => {
  DIRECTIONS.forEach(dir => {
    this.load.spritesheet(
      `${type}_${dir}`,
      `${base}assets/units/${type}/${type}_${dir}.jpeg`,
      { frameWidth: 256, frameHeight: 256 }
    );
  });
});
```

**애니메이션 등록 (BattleScene.create):**
```typescript
// 5방향 × 4애니메이션 × 4종 유닛 = 80개 등록
const ANIM_DEFS = [
  { suffix: 'idle',   frames: [0,1,2,3],     frameRate: 6,  repeat: -1 },
  { suffix: 'walk',   frames: [4,5,6,7],     frameRate: 8,  repeat: -1 },
  { suffix: 'attack', frames: [8,9,10,11],   frameRate: 10, repeat: 0  },
  { suffix: 'death',  frames: [12,13,14,15], frameRate: 6,  repeat: 0  },
];
UNIT_TYPES.forEach(type => {
  DIRECTIONS.forEach(dir => {
    const key = `${type}_${dir}`;
    ANIM_DEFS.forEach(({ suffix, frames, frameRate, repeat }) => {
      this.anims.create({
        key: `${key}_${suffix}`,
        frames: this.anims.generateFrameNumbers(key, { frames }),
        frameRate,
        repeat,
      });
    });
  });
});
```

> **스프라이트 파일 미존재 시:** `asset-agent`의 generateTexture placeholder로 대체.
> 파일 로드 실패는 `this.load.on('loaderror', ...)` 이벤트로 감지하고 fallback 처리.

## Phaser 설정 기준
```typescript
// 반드시 WebGL2 강제. 세로형 맵 영역 390×480
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 390,
  height: 480,
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [LoadingScene, BattleScene],
};
```

## 성능 규칙
- Graphics 객체 남용 금지 — 정적 배경은 한 번만 그리고 `setVisible` 토글
- 텍스트 업데이트는 값이 변할 때만 (`setText`)
- 모든 클래스/함수에 한글 주석 필수

## 완료 기준
- LoadingScene → BattleScene 전환 정상 동작
- 거점 3개 화면에 표시, owner 색상 구분
- Object Pool 20개 정상 초기화
- TypeScript strict 에러 0개
