# Task 1 — 프로젝트 생성 + 아키텍처 구축

> 담당 에이전트: `architect-agent`
> 의존성: 없음 (첫 번째 Task)
> 다음 Task: Task 2, Task 3 (병렬 착수 가능)

---

## 목표

Vite + React + TypeScript 프로젝트를 생성하고, 모든 후속 Task가 의존하는
폴더 구조 / EventBus / Zustand 스토어 / Phaser Canvas 임베드 뼈대를 완성한다.

---

## 생성할 파일 목록

```
프로젝트 루트
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env
├── .env.development
├── .env.production
├── vercel.json                         ← SPA fallback (Task 7에서 심화)
└── src/
    ├── main.tsx
    ├── types/
    │   └── index.ts                    ← 전체 인터페이스 정의
    ├── lib/
    │   └── utils.ts
    ├── app/
    │   ├── store/
    │   │   ├── playerStore.ts
    │   │   └── battleStore.ts
    │   └── ui/
    │       └── PhaserGame.tsx          ← Phaser Canvas React 임베드
    └── game/
        └── core/
            ├── Game.ts
            ├── EventBus.ts
            └── SceneManager.ts
```

---

## 구현 상세

### package.json — 의존성

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "phaser": "^3.80.0",
    "zustand": "^4.5.0",
    "eventemitter3": "^5.0.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "typescript": "^5.6.0",
    "@vitejs/plugin-react": "latest",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "latest",
    "postcss": "latest",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "latest"
  },
  "scripts": {
    "dev":     "vite",
    "build":   "tsc -b && vite build",
    "preview": "vite build && vite preview",
    "lint":    "eslint ."
  }
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_URL ?? '/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
```

### tsconfig.app.json

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### src/types/index.ts — 전체 타입 정의

```typescript
// 유닛 데이터
export interface UnitData {
  id: string;
  type: 'infantry' | 'tank' | 'air' | 'special';
  tier: number;           // 1~6
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;          // 사정거리 (타일 수): 1=근접, 3~5=단거리, 8~10=장거리
  cargo: number;          // 적재량 (Phase 1+ 자원 채집용)
  foodCost: number;       // 식량소모/시간 (Phase 1+ 유지비용)
  position: { x: number; y: number };
  target?: { x: number; y: number };
  skillCooldown: number;
  isAlive: boolean;
}

// 플레이어 데이터
export interface PlayerData {
  resources: number;
  fame: number;
  rank: 'soldier' | 'general' | 'marquis' | 'duke';
  allUnits: UnitData[];   // 최대 24개
  deck: UnitData[];       // 정확히 5개
}

// 거점 데이터
export interface CapturePoint {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
  captureProgress: number; // 0~100 점령 진행률
}

// 전투 결과
export interface BattleResult {
  result: 'win' | 'lose';
  mode: 'attack' | 'defense';
  survivalCount: number;
  timeElapsed: number;    // 초 단위
  resourceReward: number;
  fameReward: number;
}

// EventBus 이벤트 타입
export interface GameEvents {
  // React → Phaser
  'battle:start':    { deck: UnitData[]; mode: 'attack' | 'defense'; timeLimit: number };
  'battle:skill':    { unitId: string; skillIndex: number };
  'battle:swipe':    { direction: 'up' | 'down' | 'left' | 'right' | 'center' };
  'battle:autoToggle': { auto: boolean };
  // Phaser → React
  'battle:result':   BattleResult;
  'battle:hud':      { timeLeft: number; playerScore: number; enemyScore: number };
  'scene:ready':     { sceneName: string };
}

// 스킬 타입
export type SkillType = 'charge' | 'barrage' | 'airstrike' | 'heal';

export interface SkillData {
  type: SkillType;
  unitType: 'infantry' | 'tank' | 'air' | 'special';
  cooldown: number;   // 초
  duration: number;   // 초
}
```

### src/game/core/EventBus.ts

```typescript
import EventEmitter from 'eventemitter3';
import type { GameEvents } from '@/types';

// React ↔ Phaser 양방향 통신 허브
// 이 파일을 통해서만 두 시스템이 통신한다.
class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
```

### src/game/core/Game.ts

```typescript
import Phaser from 'phaser';
import { LoadingScene } from '../scenes/LoadingScene';
import { BattleScene } from '../scenes/BattleScene';

// Phaser 게임 인스턴스 설정
// WebGL2 강제, Arcade Physics 사용
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [LoadingScene, BattleScene],
  });
}
```

### src/game/core/SceneManager.ts

```typescript
import Phaser from 'phaser';

// Phaser 씬 전환 관리
// EventBus를 통해 React에서 씬 전환 요청을 받는다.
export class SceneManager {
  constructor(private game: Phaser.Game) {}

  start(sceneName: string, data?: object): void {
    this.game.scene.start(sceneName, data);
  }

  stop(sceneName: string): void {
    this.game.scene.stop(sceneName);
  }
}
```

### src/app/store/playerStore.ts

```typescript
import { create } from 'zustand';
import type { PlayerData, UnitData } from '@/types';

interface PlayerStore {
  player: PlayerData;
  setDeck: (deck: UnitData[]) => void;
  addFame: (amount: number) => void;
  addResources: (amount: number) => void;
}

const defaultUnits: UnitData[] = Array.from({ length: 5 }, (_, i) => ({
  id: `unit-${i}`,
  type: 'infantry' as const,
  tier: 1,
  hp: 100, maxHp: 100,
  attack: 10, defense: 5, speed: 8,
  range: 1, cargo: 8, foodCost: 0.21,
  position: { x: 0, y: 0 },
  skillCooldown: 0,
  isAlive: true,
}));

// 플레이어 전역 상태 슬라이스
export const usePlayerStore = create<PlayerStore>((set) => ({
  player: {
    resources: 1000,
    fame: 0,
    rank: 'soldier',
    allUnits: defaultUnits,
    deck: defaultUnits.slice(0, 5),
  },
  setDeck: (deck) => set((s) => ({ player: { ...s.player, deck } })),
  addFame: (amount) => set((s) => ({ player: { ...s.player, fame: s.player.fame + amount } })),
  addResources: (amount) => set((s) => ({ player: { ...s.player, resources: s.player.resources + amount } })),
}));
```

### src/app/store/battleStore.ts

```typescript
import { create } from 'zustand';
import type { BattleResult } from '@/types';

interface BattleStore {
  isInBattle: boolean;
  mode: 'attack' | 'defense';
  timeLimit: number;
  lastResult: BattleResult | null;
  startBattle: (mode: 'attack' | 'defense', timeLimit?: number) => void;
  endBattle: (result: BattleResult) => void;
}

// 전투 상태 슬라이스
export const useBattleStore = create<BattleStore>((set) => ({
  isInBattle: false,
  mode: 'attack',
  timeLimit: 600,    // 기본 10분
  lastResult: null,
  startBattle: (mode, timeLimit = 600) =>
    set({ isInBattle: true, mode, timeLimit }),
  endBattle: (result) =>
    set({ isInBattle: false, lastResult: result }),
}));
```

### src/app/ui/PhaserGame.tsx

```typescript
import { useEffect, useRef } from 'react';
import { createGame } from '@/game/core/Game';
import type Phaser from 'phaser';

// Phaser Canvas를 React DOM에 마운트하는 컴포넌트.
// React 파일에 Phaser 로직 작성 금지 — 이 컴포넌트는 마운트/언마운트만 처리.
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    gameRef.current = createGame(containerRef.current);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

### src/main.tsx

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/ui/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 완료 조건 (Acceptance Criteria)

- [ ] `npm install` 오류 없음
- [ ] `npm run dev` → 브라우저에 Phaser canvas 렌더링 확인
- [ ] `npm run build` → TypeScript 컴파일 오류 없음
- [ ] `npm run preview` → 빌드 결과물 정상 동작
- [ ] `src/types/index.ts` 에 모든 인터페이스 정의 완료
- [ ] EventBus import 가 `game/` 과 `app/` 양쪽에서 동작
- [ ] Zustand 스토어 2개 (playerStore, battleStore) 생성 완료
- [ ] `any` 타입 사용 없음 (`tsc --strict` 통과)
