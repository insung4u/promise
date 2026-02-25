---
name: scene-agent
description: Phaser BattleScene 기본 구조 전담. 800x600 맵, 배경(풀/길/산), 3개 거점 스프라이트, Object Pool 20개 준비, LoadingScene을 구현한다. PRD Task 3에서 호출. architect-agent 완료 후 실행.
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

### 맵 구성 (800 x 600)
- 배경: 풀(초록) + 길(회색) + 산(갈색/진녹) 타일맵 또는 Graphics로 구성
- placeholder 단계에서는 Graphics API로 색상 블록으로 표현해도 됨

### 거점 3개 (CapturePoint)
```
좌상 (100, 100)  → 적 시작 거점  (owner: 'enemy')
중앙 (400, 300)  → 중립 거점    (owner: 'neutral')
우하 (700, 500)  → 아군 시작 거점 (owner: 'player')
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

### 스와이프 명령 존 (왼쪽 30%)
- 투명 Rectangle 오버레이 (x: 0, y: 0, width: 240, height: 600)
- 터치/포인터 이벤트를 CommandSystem에 전달하는 연결 포인트만 마련

## 씬 전환 규칙
- LoadingScene → BattleScene: `this.scene.start('BattleScene')`
- BattleScene → 결과 화면: `EventBus.emit('battle:end', result)` 발행 (React가 수신)

## Phaser 설정 기준
```typescript
// 반드시 WebGL2 강제
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
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
