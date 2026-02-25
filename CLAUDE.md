# CLAUDE.md — 머나먼약속 (A Distant Promise)

> 이 파일은 Claude Code가 매 세션마다 자동으로 읽는 프로젝트 지침서다.
> PRD 전체 내용은 `docs/prd.md`를 참조한다.

---

## 프로젝트 개요

- **장르**: 모바일 RTS (택티컬 커멘더스 스타일, 싱글플레이어)
- **Phase**: 0 — 클라이언트-only MVP (서버 없음)
- **목표**: 5유닛 매크로 컨트롤 + 오토 전투 + 터치 명령 재미 검증

---

## Tech Stack

| 역할 | 패키지 | 버전 |
|---|---|---|
| 번들러 | Vite | 5.4+ |
| UI 프레임워크 | React | 19 |
| 언어 | TypeScript | 5.6 (strict 필수) |
| 게임 엔진 | Phaser | 3.80+ (WebGL2 강제, Arcade Physics) |
| 상태관리 | Zustand | 4.5 |
| 스타일 | TailwindCSS + shadcn/ui | 3.4 |
| React↔Phaser 통신 | EventEmitter3 | latest |
| 터치 | Hammer.js 또는 Phaser 내장 | - |
| PWA→앱 | Capacitor | 6 |

---

## 폴더 구조 (변경 금지)

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

## 절대 규칙 (위반 금지)

### 아키텍처
- Phaser 로직은 `game/` 폴더에만. React 파일에 Phaser 코드 작성 금지.
- React는 `PhaserGame` 컴포넌트 → EventBus 경유로만 Phaser와 통신.
- React에서 Phaser 인스턴스 직접 참조 금지 (`game.scene.getScene()` 등).
- 상태관리는 Zustand만. Redux, Context API, 기타 라이브러리 도입 금지.
- 타입은 `types/index.ts` 한 곳에만 정의. 인라인 타입 정의 금지.

### 코드 스타일
- TypeScript `strict: true` 유지. `any` 사용 절대 금지.
- React 컴포넌트는 함수형만. 클래스 컴포넌트 금지.
- 모든 클래스 및 중요 함수 위에 **한글 주석** 필수.

### 성능
- 모바일 저사양 기준: 10유닛 + 20발 투사체 → 60FPS 유지.
- `update()` 루프 내 `new` 객체 생성 금지 (Object Pool 사용).
- Graphics 객체는 값 변경 시에만 재드로우.

---

## 배포 규칙

```json
// package.json scripts
{
  "dev":     "vite",
  "build":   "tsc -b && vite build",
  "preview": "vite build && vite preview",
  "lint":    "eslint ."
}
```

- `npm run preview` = 빌드 후 로컬 서빙 → Vercel 결과와 동일 동작 보장.
- asset 경로는 `import.meta.env.BASE_URL` 기반 사용. 절대 경로(`/assets/`) 금지.
- `vercel.json` SPA fallback rewrite 필수.

### AI 에셋 자동 생성 (Image Generation)
Claude, Cursor, Gemini 등 모든 AI 에이전트는 플레이스홀더를 사용하지 말고 아래 스크립트로 직접 스프라이트를 생성해 적용한다.

**8방향 스프라이트 시트 생성 (권장):**
```bash
# 전체 5방향 생성 (W/NW/SW는 Phaser flipX 처리)
node scripts/generate_spritesheet.mjs <유닛타입>
# 예) node scripts/generate_spritesheet.mjs infantry

# 특정 방향만 생성 (E / NE / N / SE / S)
node scripts/generate_spritesheet.mjs infantry E
```
* 출력: `public/assets/units/<유닛타입>/<유닛타입>_<방향>.jpeg`
* 규격: 4×4 그리드, 1024×1024px, `frameWidth: 256, frameHeight: 256`

**단일 이미지 생성 (레거시, 그리드 비보장):**
```bash
node scripts/generate_sprite.mjs "프롬프트 내용" "폴더명/저장할파일명.jpeg"
```
* **주의**: 루트 디렉토리의 `.env` 파일에 `GEMINI_API_KEY` 설정 확인. 프롬프트는 영어로 상세하게 작성 (`docs/asset_generation_guide.md` 참조).
* **문서화 의무**: 이미지가 하위 디렉토리에 생성되면, **반드시 해당 디렉토리 내의 `README.md` 파일을 생성하거나 수정하여 어떤 이미지가 추가/수정되었는지 기록**해야 한다.

---

## 개발 워크플로 규칙 (필수)

**개발 착수 전 반드시 task 문서를 먼저 확인한다.**

```
Task 실행 순서:
  1. docs/task-N.md 를 읽어 구현 계획 파악
  2. 사용자에게 계획 보고 (실행 전)
  3. 승인 후 코드 작성
```

- `docs/task-1.md` ~ `docs/task-7.md` 에 각 Task의 구체적 구현 내용이 있다.
- task 문서 없이 즉시 코드를 작성하지 않는다.
- task 문서의 "완료 조건"을 모두 충족해야 해당 Task를 완료로 간주한다.

## Sub-agent

**사용자는 `pm-agent`에게만 지시한다.** PM이 나머지 에이전트를 조율한다.
에이전트 목록, 호출 시점, 실행 순서 의존성은 `.claude/README.md` 참조.

| 에이전트 | 역할 요약 |
|---|---|
| `asset-agent` | Phaser `generateTexture` 코드로 런타임 placeholder 생성 |
| `sprite-agent` | Gemini Imagen API → 실제 JPEG 스프라이트 시트 생성 전담 |

---

## 핵심 데이터 모델 요약

```typescript
// types/index.ts 기준
UnitData    → id, type('infantry'|'tank'|'air'|'special'), tier(1~6), hp, attack, speed...
PlayerData  → resources, fame, rank('soldier'|'general'|'marquis'|'duke'), allUnits(24), deck(5)
CapturePoint → id, x, y, owner('player'|'enemy'|'neutral'), hp
BattleResult → result('win'|'lose'), survivalCount, timeElapsed, resourceReward, fameReward
```

---

## 전투 화면 레이아웃

모바일 세로형(Portrait)만 지원. 해상도: **390×844** (iPhone 14 논리 해상도 기준).

```
세로형 전투 레이아웃 (390×844):
┌──────────────────────────┐
│  타이머        점수/모드   │  ← HUD (~60px)
├──────────────────────────┤
│    ●  적 거점 (195, 80)   │
│                          │
│  ← Phaser 맵 390×480 →   │  ← 맵 영역 (~480px)
│                          │
│    ●  중립 거점 (195,240) │
│                          │
│    ●  아군 거점 (195,400) │
├──────────────────────────┤
│[스킬1][스킬2][스킬3][스킬4][오토]│  ← 스킬 버튼 (~80px)
├──────────────────────────┤
│                          │
│      스와이프 명령 존       │  ← 스와이프 존 (~224px)
│   ↑전진  ↓후퇴  ←좌  →우  │
└──────────────────────────┘
```

---

## MVP Task 순서

1. 프로젝트 생성 + 아키텍처 (`architect-agent`)
2. 로비 화면 (`ui-agent`)
3. BattleScene 기본 (`scene-agent`)
4. 4종 유닛 (`unit-agent`)
5. AutoAI + CommandSystem (`ai-agent`)
6. SkillSystem + 승패 판정 (`skill-agent`)
7. PWA + 배포 최적화 (`deploy-agent`)
