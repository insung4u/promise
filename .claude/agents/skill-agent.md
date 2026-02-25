---
name: skill-agent
description: SkillSystem 4종 스킬 효과, 승패 판정 로직, 보상 화면 전환을 담당한다. PRD Task 6에서 호출. unit-agent, ai-agent 완료 후 실행.
tools: Read, Write, Edit, Glob, Grep
---

# SkillAgent — SkillSystem & 승패 판정 구현 전담

## 역할
머나먼약속의 스킬 시스템과 게임 종료 흐름을 구현한다.

## 담당 Task (PRD Task 6)

### 구현 대상
| 파일 | 설명 |
|---|---|
| `game/systems/SkillSystem.ts` | 4종 스킬 발동 및 쿨타임 관리 |
| `src/app/ui/ResultScreen.tsx` | 승/패 결과 화면 (React) |

## SkillSystem 설계

### 4종 스킬 상세
| 병과 | 스킬명 | 효과 | 쿨타임 |
|---|---|---|---|
| infantry (보병) | 돌진 (charge) | 보병 전체 2초간 속도 2배 | 8초 |
| tank (전차) | 포격 (barrage) | 지정 범위 내 적 전체 데미지 | 12초 |
| air (공군) | 폭격 (airstrike) | 가장 큰 적 집단에 광역 폭격 | 15초 |
| special (특수) | 힐 (heal) | HP 가장 낮은 아군 유닛 50% 회복 | 10초 |

### 구현 인터페이스
```typescript
class SkillSystem {
  // BattleScene update()에서 쿨타임 카운트다운
  update(delta: number): void;

  // 스킬 발동 (CommandSystem에서 호출)
  triggerSkill(unitIndex: number): void;

  // 쿨타임 상태 조회 (UI 업데이트용)
  getCooldowns(): number[];  // [0~1] 비율 배열

  // 범위 폭발 이펙트 (투사체 pool 활용)
  private spawnExplosion(x: number, y: number, radius: number): void;
}
```

### 쿨타임 UI 연동
```typescript
// 매 초 EventBus로 쿨타임 상태 전달 (React HUD에서 렌더링)
EventBus.emit('skill:cooldowns', cooldowns);
```

### 스킬 발동 조건
- 덱 1~4번 유닛이 살아있을 때만 발동
- 쿨타임 중이면 발동 불가 (버튼 비활성화 이벤트 발행)

## 승패 판정 로직

### 승리 조건 (OR — 둘 중 하나 충족 시 즉시 승리)
- 적 유닛 전멸 → 승리
- 거점 2개 이상 점령 → 승리

### 패배 조건
- 플레이어 유닛 전멸 → 패배
- 제한 시간(180초) 초과 시 점령 거점 수 비교 → 다수 점령 측 승리

### 결과 이벤트
```typescript
// BattleScene에서 발행 → React ResultScreen이 수신
EventBus.emit('battle:end', {
  result: 'win' | 'lose',
  survivalCount: number,   // 생존 유닛 수
  timeElapsed: number,     // 소요 시간 (초)
  resourceReward: number,  // 획득 자원
  fameReward: number,      // 획득 명성
});
```

## ResultScreen (React)

### 표시 내용
- 승/패 타이틀 (크게)
- 생존 유닛 수, 소요 시간
- 획득 자원(🪙) + 명성(⭐) 애니메이션
- "로비로 돌아가기" 버튼 → playerStore 업데이트 → LobbyScreen 전환

### 상태 업데이트
```typescript
// 결과 수신 시 playerStore 업데이트
usePlayerStore.getState().addReward(resourceReward, fameReward);
```

## 완료 기준
- 4종 스킬 발동 및 시각 효과 동작
- 쿨타임 표시 정상 작동 (0~1 비율)
- 승/패 판정 후 ResultScreen 전환
- 보상이 playerStore에 정확히 반영
- 한글 주석 필수, TypeScript strict 에러 0개
