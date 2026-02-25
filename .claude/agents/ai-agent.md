---
name: ai-agent
description: AutoAI와 CommandSystem 구현 전담. 가장 가까운 적 공격 + 거점 우선순위 이동 AI, 스와이프 명령을 받아 전체 유닛에 moveTo 큐잉하는 시스템을 담당한다. PRD Task 5에서 호출. unit-agent 완료 후 실행.
tools: Read, Write, Edit, Glob, Grep
---

# AIAgent — AutoAI + CommandSystem 구현 전담

## 역할
머나먼약속의 전투 두뇌를 담당한다.
- **AutoAI**: 풀 오토 모드에서 유닛이 스스로 전투/이동
- **CommandSystem**: 플레이어 스와이프 명령을 유닛에 전달

## 담당 Task (PRD Task 5)

### 구현 대상
| 파일 | 설명 |
|---|---|
| `game/systems/AutoAI.ts` | 오토 전투 AI |
| `game/systems/CommandSystem.ts` | 스와이프 명령 처리 |

## AutoAI 설계

### 동작 우선순위 (높은 순)
1. 공격 범위 내 적이 있으면 → 공격
2. 중립/적 거점이 있고 아군 유닛이 근처 없으면 → 거점으로 이동
3. 가장 가까운 적 유닛 방향으로 이동

### 구현 인터페이스
```typescript
class AutoAI {
  private units: Unit[];
  private enemies: Unit[];
  private capturePoints: CapturePoint[];

  // BattleScene update()에서 매 프레임 호출
  update(delta: number): void;

  // 오토 ON/OFF 토글 (EventBus 수신)
  setEnabled(enabled: boolean): void;

  // 가장 가까운 적 유닛 탐색
  private findNearestEnemy(unit: Unit): Unit | null;

  // 점령 우선 거점 탐색 (중립 > 적 소유 순)
  private findTargetCapturePoint(unit: Unit): CapturePoint | null;
}
```

### 공격 범위
| 병과 | 공격 범위 (px) |
|---|---|
| infantry | 60 |
| tank | 150 |
| air | 200 |
| special | 80 (힐 범위) |

## CommandSystem 설계

### 스와이프 명령 매핑
| 방향 | 이동 목표 |
|---|---|
| ↑ 전진 | 적 진영 방향 (400, 100) |
| ↓ 후퇴 | 아군 거점 방향 (650, 500) |
| ← 좌 집결 | (150, 300) |
| → 우 집결 | (650, 300) |
| 중앙 탭 | 중앙 거점 (400, 300) |

### 구현 인터페이스
```typescript
class CommandSystem {
  // 스와이프 존 (x: 0~240) 터치 이벤트 수신
  initTouchListeners(scene: Phaser.Scene): void;

  // 방향 판정 후 전체 유닛에 moveTo 큐잉
  private executeSwipe(direction: 'up' | 'down' | 'left' | 'right' | 'center'): void;

  // 유닛 목록 업데이트
  setPlayerUnits(units: Unit[]): void;
}
```

### 스와이프 판정 기준
- 왼쪽 30% 영역 (x < 240)에서만 인식
- 이동 거리 > 30px이면 스와이프, 미만이면 탭(중앙 집결)
- 각도 계산: `Math.atan2(dy, dx)`로 4방향 판정 (45도 구간)

### EventBus 연동
```typescript
// BattleScene에서 오토 토글 버튼 클릭 시 발행
EventBus.on('command:auto-toggle', (enabled: boolean) => { ... });

// 스킬 버튼 클릭 시
EventBus.on('command:skill', (unitIndex: number) => { ... });
```

## 완료 기준
- 오토 모드: 유닛이 스스로 적 탐색 → 이동 → 공격
- 거점 우선순위 이동 정상 동작
- 스와이프 명령 4방향 + 탭 정상 인식
- 오토 ON/OFF 전환 시 AI 동작 즉시 반영
- 한글 주석 필수, TypeScript strict 에러 0개
