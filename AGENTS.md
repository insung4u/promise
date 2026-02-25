# AGENTS.md — 머나먼약속 (A Distant Promise)

> 이 파일은 Claude Code, Gemini CLI, Cursor, Antigravity 등 모든 AI 도구가 공통으로 참조하는
> 프로젝트 지침서다. 도구별 세부 규칙은 각 전용 파일을 추가로 확인한다.
>
> - Claude Code  → `CLAUDE.md`
> - Cursor       → `.cursorrules` / `.cursor/rules/promise.mdc`
> - Gemini CLI   → `GEMINI.md`
> - PRD 전체     → `docs/prd.md`

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 게임 제목 | 머나먼약속 (A Distant Promise) |
| 장르 | 모바일 RTS — 5유닛 매크로 컨트롤 + 오토 전투 |
| Phase | 0 — 클라이언트-only MVP (서버 없음, 싱글플레이어) |
| 목표 | 스와이프 명령 + 오토 전투 재미 검증 |

---

## 2. Tech Stack

| 역할 | 패키지 | 버전 |
|---|---|---|
| 번들러 | Vite | 5.4+ |
| UI | React | 19 |
| 언어 | TypeScript | 5.6 (strict 필수) |
| 게임 엔진 | Phaser | 3.80+ (WebGL2, Arcade Physics) |
| 상태관리 | Zustand | 4.5 |
| 스타일 | TailwindCSS + shadcn/ui | 3.4 |
| React↔Phaser 통신 | EventEmitter3 | latest |
| 터치 | Hammer.js 또는 Phaser 내장 | - |
| PWA→앱 | Capacitor | 6 |

---

## 3. 폴더 구조 (변경 금지)

```
src/
├── app/
│   ├── store/          # Zustand 슬라이스만
│   └── ui/             # React 컴포넌트만
├── game/
│   ├── core/           # Game.ts, EventBus.ts, SceneManager.ts
│   ├── entities/       # Unit.ts, UnitFactory.ts, Projectile.ts
│   ├── scenes/         # BattleScene.ts, LoadingScene.ts
│   └── systems/        # AutoAI.ts, CommandSystem.ts, SkillSystem.ts
├── types/
│   └── index.ts        # 모든 인터페이스 — 유일한 타입 정의 파일
├── lib/
│   └── utils.ts
└── main.tsx
```

---

## 4. 핵심 데이터 모델

```typescript
// 모든 타입은 types/index.ts 한 곳에만 정의한다.

interface UnitData {
  id: string;
  type: 'infantry' | 'tank' | 'air' | 'special';
  tier: number;        // 1~6
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;       // 사정거리 (타일 수): 1=근접, 3~5=단거리, 8~10=장거리
  cargo: number;       // 적재량 (Phase 1+ 자원 채집용)
  foodCost: number;    // 식량소모/시간 (Phase 1+ 유지비용)
  position: { x: number; y: number };
  target?: { x: number; y: number };
  skillCooldown: number;
  isAlive: boolean;
}

interface PlayerData {
  resources: number;
  fame: number;
  rank: 'soldier' | 'general' | 'marquis' | 'duke';
  allUnits: UnitData[];   // 최대 24개
  deck: UnitData[];       // 정확히 5개
}

interface CapturePoint {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
  captureProgress: number; // 0~100 점령 진행률
}

interface BattleResult {
  result: 'win' | 'lose';
  mode: 'attack' | 'defense';
  survivalCount: number;
  timeElapsed: number;
  resourceReward: number;
  fameReward: number;
}
```

---

## 5. 전투 모드

| 모드 | 시간 제한 | 승리 조건 |
|---|---|---|
| 공격 | 5~15분 | 제한 시간 내 적 거점 점령 완료 |
| 방어 | 10~15분 | 시간 동안 아군 거점 수호 (전멸 또는 시간 초과 시 패배) |

---

## 6. 절대 규칙

### 아키텍처
- Phaser 로직은 `game/` 폴더에만 작성. React 파일에 Phaser 코드 금지.
- React → Phaser 통신은 `EventBus`(EventEmitter3) 경유만 허용.
- React에서 Phaser 인스턴스 직접 참조 금지 (`game.scene.getScene()` 등).
- 전역 상태는 Zustand만. Redux, Context API 금지.
- 타입은 `types/index.ts` 한 곳에만. 인라인 타입 정의 금지.

### 코드 스타일
- TypeScript `strict: true`. `any` 사용 절대 금지.
- React 컴포넌트는 함수형만. 클래스 컴포넌트 금지.
- 모든 클래스 및 중요 함수 위에 **한글 주석** 필수.

### 성능
- 모바일 저사양 기준: 10유닛 + 20발 투사체 → 60FPS 유지.
- `update()` 루프 내 `new` 객체 생성 금지 → Object Pool 사용.
- Graphics 객체는 값 변경 시에만 재드로우.

---

## 7. 개발 스크립트

```bash
npm run dev      # 로컬 개발 서버
npm run build    # tsc -b && vite build
npm run preview  # vite build && vite preview  (Vercel 동작과 동일)
npm run lint     # eslint .
```

- asset 경로는 `import.meta.env.BASE_URL` 기반 사용. 절대 경로(`/assets/`) 금지.
- `vercel.json` SPA fallback rewrite 필수.

---

## 8. MVP Task 순서

1. 프로젝트 생성 + 아키텍처 (`architect-agent`)
2. 로비 화면 (`ui-agent`)
3. BattleScene 기본 (`scene-agent`)
4. 4종 유닛 (`unit-agent`)
5. AutoAI + CommandSystem (`ai-agent`)
6. SkillSystem + 공격/방어 승패 판정 (`skill-agent`)
7. PWA + 배포 최적화 (`deploy-agent`)

---

## 9. Phase 1+ 로드맵 (MVP 이후 구현 예정)

- 영토 지도 시스템 (수도 시작 → 국왕 거점 점령)
- 국가 기술 시스템 (발전 / 경제 / 전투 3종 카테고리)
- 자원 기부 & 기부포인트 시스템
- 연맹 & 왕국 점령 이벤트 (국왕 보상 + 공방 버프)
