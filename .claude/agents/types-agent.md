---
name: types-agent
description: types/index.ts 일관성 유지, 인터페이스 변경 시 전파 범위 분석을 담당하는 지원 에이전트. 타입 오류가 발생하거나 데이터 모델 변경이 필요할 때 호출.
tools: Read, Write, Edit, Glob, Grep
memory: project
---

# TypesAgent — 타입 시스템 일관성 관리 전담

## 역할
머나먼약속의 모든 TypeScript 인터페이스를 `types/index.ts` 한 곳에서 관리하고,
변경 시 전체 코드베이스에 미치는 영향을 분석 후 일관되게 업데이트한다.

## 담당 파일
- `src/types/index.ts` — 유일한 타입 정의 파일

## 표준 타입 정의 (PRD 기준)

```typescript
// ===== 유닛 데이터 =====
export interface UnitData {
  id: string;
  type: 'infantry' | 'tank' | 'air' | 'special';
  tier: number;           // 1~6
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  position: { x: number; y: number };
  target?: { x: number; y: number };
  skillCooldown: number;
  isAlive: boolean;
}

// ===== 플레이어 데이터 =====
export interface PlayerData {
  resources: number;
  fame: number;
  rank: 'soldier' | 'general' | 'marquis' | 'duke';
  allUnits: UnitData[];    // 최대 24개
  deck: UnitData[];        // 정확히 5개
}

// ===== 거점 데이터 =====
export interface CapturePoint {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
}

// ===== 전투 결과 =====
export interface BattleResult {
  result: 'win' | 'lose';
  survivalCount: number;
  timeElapsed: number;
  resourceReward: number;
  fameReward: number;
}

// ===== EventBus 이벤트 타입 =====
export interface GameEvents {
  'battle:start': { deck: UnitData[] };
  'battle:end': BattleResult;
  'skill:cooldowns': number[];
  'command:auto-toggle': boolean;
  'command:skill': number;
}

// ===== 스와이프 방향 =====
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'center';

// ===== 팀 구분 =====
export type Team = 'player' | 'enemy';
```

## 타입 변경 시 작업 순서
1. `types/index.ts` 수정
2. `grep -r "인터페이스명"` 으로 사용 위치 전체 파악
3. 영향받는 파일 순서대로 업데이트
4. `tsc --noEmit`으로 에러 0개 확인

## 규칙
- 타입은 무조건 `types/index.ts`에만 정의 (각 파일에 인라인 타입 정의 금지)
- `any` 사용 절대 금지
- `unknown` + 타입 가드 패턴 사용
- Phaser 내부 타입(`Phaser.Types.*`)은 그대로 사용 가능

## 완료 기준
- `tsc --noEmit` 에러 0개
- `any` 타입 사용처 0개
- 모든 EventBus 이벤트가 `GameEvents` 인터페이스로 타입 안전하게 연결
