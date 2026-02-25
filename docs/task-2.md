# Task 2 — 로비 화면

> 담당 에이전트: `ui-agent`
> 의존성: **Task 1 완료 후** 착수 (types/index.ts, Zustand 스토어 필요)
> 병렬 착수 가능: Task 3 (독립적)

---

## 목표

React + TailwindCSS + shadcn/ui 로 로비 화면을 완성한다.
전투 시작 전 덱 편성(드래그&드롭)과 플레이어 정보 표시가 핵심이다.

---

## 생성할 파일 목록

```
src/app/ui/
├── App.tsx                         ← 라우터 (로비 ↔ 전투 전환)
├── LobbyScreen.tsx                 ← 로비 전체 레이아웃
└── components/
    ├── TopBar.tsx                  ← 자원/명성/계급 상단 바
    ├── UnitCard.tsx                ← 유닛 카드 (드래그 소스)
    ├── DeckSlot.tsx                ← 덱 슬롯 (드롭 타깃)
    └── BattleStartButton.tsx       ← 전투 시작 버튼
```

---

## 화면 레이아웃

```
┌────────────────────────────────────┐
│ 🪙 1000   ⭐ 0   [병사 계급 아이콘] │  ← TopBar (h-12)
├────────────────────────────────────┤
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐         │
│  │  ││  ││  ││  ││  ││  │  ...    │  ← 24유닛 그리드 (4열)
│  └──┘└──┘└──┘└──┘└──┘└──┘         │
│                                    │
│  덱 편성 ─────────────────────     │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐             │
│  │  ││  ││  ││  ││  │             │  ← 덱 5슬롯 (드롭 영역)
│  └──┘└──┘└──┘└──┘└──┘             │
├────────────────────────────────────┤
│         [ 전투 시작 ]              │  ← 하단 버튼 (덱 < 5 시 비활성)
└────────────────────────────────────┘
```

---

## 구현 상세

### src/app/ui/App.tsx

```typescript
import { useBattleStore } from '@/app/store/battleStore';
import LobbyScreen from './LobbyScreen';
import PhaserGame from './PhaserGame';
import BattleResultScreen from './BattleResultScreen';

// 앱 최상위 — 로비 / 전투 / 결과 화면 전환
export default function App() {
  const { isInBattle, lastResult } = useBattleStore();

  if (lastResult && !isInBattle) return <BattleResultScreen result={lastResult} />;
  if (isInBattle) return <PhaserGame />;
  return <LobbyScreen />;
}
```

### src/app/ui/LobbyScreen.tsx

- `usePlayerStore()`로 `player.allUnits`, `player.deck` 읽기
- HTML5 Drag API (`draggable`, `onDragStart`, `onDrop`, `onDragOver`)
- 유닛 카드 → 덱 슬롯으로 드래그 & 드롭
- 덱에서 유닛 제거: 슬롯 클릭 시 제거

### src/app/ui/components/TopBar.tsx

```typescript
// 자원 / 명성 / 계급 아이콘 표시
// usePlayerStore에서 읽기 전용으로 구독

const RANK_LABEL: Record<PlayerData['rank'], string> = {
  soldier: '병사',
  general: '장군',
  marquis: '후작',
  duke:    '공작',
};
```

### src/app/ui/components/UnitCard.tsx

Props:
```typescript
interface UnitCardProps {
  unit: UnitData;
  isDragging?: boolean;
  onDragStart: (unit: UnitData) => void;
}
```
표시 정보:
- 유닛 타입 아이콘 (보병/전차/공군/특수 placeholder 색상 구분)
- 티어 배지 (T1 ~ T6)
- 공격력 / 방어력 / 체력 수치

### src/app/ui/components/DeckSlot.tsx

Props:
```typescript
interface DeckSlotProps {
  index: number;           // 0~4
  unit: UnitData | null;
  onDrop: (unit: UnitData, slotIndex: number) => void;
  onRemove: (slotIndex: number) => void;
}
```

### src/app/ui/components/BattleStartButton.tsx

```typescript
// 덱 유닛이 5개 미만이면 disabled 상태
// 클릭 시 useBattleStore.startBattle() + EventBus.emit('battle:start') 호출
```

---

## shadcn/ui 사용 컴포넌트

```
Button      → 전투 시작 버튼
Badge       → 유닛 티어 표시
Separator   → 섹션 구분선
```

설치 명령:
```bash
npx shadcn@latest init
npx shadcn@latest add button badge separator
```

---

## 완료 조건

- [ ] 24유닛 그리드 표시 (스크롤 가능)
- [ ] 유닛 카드 → 덱 슬롯 드래그&드롭 동작
- [ ] 덱 슬롯 클릭 시 유닛 제거
- [ ] 덱 5개 미만 시 버튼 비활성화
- [ ] TopBar 에 자원/명성/계급 표시
- [ ] 전투 시작 버튼 클릭 → `useBattleStore.startBattle()` 호출
- [ ] TypeScript strict 통과, `any` 없음
- [ ] 모바일 세로(390×844) 레이아웃 정상
