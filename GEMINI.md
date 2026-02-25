# GEMINI.md — 머나먼약속 (A Distant Promise)

> Gemini CLI가 매 세션마다 자동으로 읽는 프로젝트 지침서다.
> 범용 가이드: `AGENTS.md` / PRD 전체: `docs/prd.md`

---

## 프로젝트 개요

- **장르**: 모바일 RTS (싱글플레이어 MVP)
- **Phase**: 0 — 클라이언트-only (서버 없음)
- **목표**: 5유닛 매크로 컨트롤 + 오토 전투 + 터치 명령 재미 검증

---

## Tech Stack

```
Vite 5.4+ / React 19 / TypeScript 5.6 (strict)
Phaser 3.80+ (WebGL2, Arcade Physics)
Zustand 4.5
TailwindCSS 3.4 + shadcn/ui
EventEmitter3 (React ↔ Phaser 통신 전용)
Capacitor 6 (PWA → 앱 변환)
```

---

## 폴더 구조 (변경 금지)

```
src/
├── app/
│   ├── store/     # Zustand 슬라이스만
│   └── ui/        # React 컴포넌트만
├── game/
│   ├── core/      # Game.ts, EventBus.ts, SceneManager.ts
│   ├── entities/  # Unit.ts, UnitFactory.ts, Projectile.ts
│   ├── scenes/    # BattleScene.ts, LoadingScene.ts
│   └── systems/   # AutoAI.ts, CommandSystem.ts, SkillSystem.ts
├── types/
│   └── index.ts   # 모든 인터페이스 — 유일한 타입 정의 파일
└── main.tsx
```

---

## 핵심 규칙

### 아키텍처
1. Phaser 로직은 `game/` 폴더에만. React 파일에 Phaser 코드 작성 금지.
2. React → Phaser 통신은 `EventBus`(EventEmitter3) 경유만 허용.
3. Phaser 인스턴스 직접 참조 금지 (`game.scene.getScene()` 등).
4. 상태관리는 Zustand만. Redux, Context API 금지.
5. 타입은 `types/index.ts` 한 곳에만 정의. 인라인 타입 정의 금지.

### 코드 스타일
- TypeScript `strict: true`. `any` 절대 금지.
- React 함수형 컴포넌트만 사용. 클래스 컴포넌트 금지.
- 모든 클래스와 중요 함수 위에 **한글 주석** 필수.
- asset 경로: `import.meta.env.BASE_URL` 기반 (절대 경로 `/assets/` 금지).

### 성능
- `update()` 루프 내 `new` 객체 생성 금지 → Object Pool 사용.
- 목표: 10유닛 + 20발 투사체 → 60FPS (모바일 저사양 기준).

---

## 전투 모드

| 모드 | 시간 제한 | 승리 조건 |
|---|---|---|
| 공격 | 5~15분 | 제한 시간 내 적 거점 점령 완료 |
| 방어 | 10~15분 | 시간 동안 아군 거점 수호 |

---

## 핵심 타입 요약

```typescript
// types/index.ts
UnitData     → id, type('infantry'|'tank'|'air'|'special'), tier(1~6), hp, attack, speed
PlayerData   → resources, fame, rank('soldier'|'general'|'marquis'|'duke'), allUnits(24), deck(5)
CapturePoint → id, x, y, owner('player'|'enemy'|'neutral'), hp
BattleResult → result('win'|'lose'), mode('attack'|'defense'), survivalCount, timeElapsed, ...
```

---

## 개발 스크립트

```bash
npm run dev      # 로컬 개발 서버
npm run build    # tsc -b && vite build
npm run preview  # vite build && vite preview (Vercel 동작과 동일)
npm run lint     # eslint .
```

### AI 자동 이미지 생성
Gemini, Claude Code 등 AI 어시스턴트는 더 이상 대충 만든 플레이스홀더를 쓰지 말고, 아래 스크립트로 **직접 에셋 스프라이트를 생성**하여 로컬에 저장한다.
```bash
node scripts/generate_sprite.mjs "상세한 영문 프롬프트 (docs/asset_generation_guide.md 참조)" "파일명.jpeg"
```
* 루트에 `.env` (GEMINI_API_KEY) 설정 필수.
---

## Phase 1+ 로드맵 (MVP 이후)

- 영토 지도 시스템 (수도 → 국왕 거점 점령)
- 국가 기술 시스템 (발전 / 경제 / 전투 3종)
- 자원 기부 & 기부포인트
- 연맹 & 왕국 점령 이벤트
