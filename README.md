# 머나먼약속 (A Distant Promise)

> 택티컬 커멘더스 느낌의 모바일 RTS — 5유닛 매크로 컨트롤 + 오토 전투 + 터치 명령

---

## 소개

**머나먼약속**은 서버 없이 싱글플레이어로 즐기는 모바일 RTS 게임입니다.

복잡한 유닛 조작 없이, 스와이프 한 번으로 부대 전체를 지휘하고 스킬 타이밍만 잘 맞추면 전투를 승리로 이끌 수 있습니다. 빠른 판단과 매크로 컨트롤의 재미를 모바일에서 체감하는 것을 목표로 합니다.

---

## 핵심 특징

- **풀 오토 전투** — AI가 자동으로 가장 가까운 적을 공격하고 거점을 점령
- **스와이프 명령** — 화면 하단을 쓸어 전진 / 후퇴 / 좌우 집결을 한 번에 지시
- **4종 병과** — 보병 / 전차 / 공군 / 특수의 조합으로 덱 편성
- **스킬 시스템** — 돌진 · 포격 · 폭격 · 힐, 쿨타임을 노린 한 방
- **덱 편성** — 24개 유닛 중 5개를 골라 나만의 전략 구성
- **PWA 지원** — 홈 화면 추가 후 앱처럼 실행, 세로 방향(Portrait) 고정

---

## 라이브 데모

**[https://promise-sooty.vercel.app/](https://promise-sooty.vercel.app/)**

> GitHub main 브랜치 push 시 Vercel 자동 배포됩니다.

---

## Tech Stack

| 역할 | 기술 | 버전 |
|---|---|---|
| 번들러 | Vite | 5.4+ |
| UI 프레임워크 | React | 19 |
| 언어 | TypeScript | 5.6 (strict) |
| 게임 엔진 | Phaser | 3.80+ (WebGL2, Arcade Physics) |
| 상태관리 | Zustand | 4.5 |
| 스타일 | TailwindCSS + shadcn/ui | 3.4 |
| React-Phaser 통신 | EventEmitter3 | 5.x |
| PWA | vite-plugin-pwa (Workbox) | 1.x |
| 아이콘 생성 | sharp | 0.34+ |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드 후 로컬 미리보기 (Vercel 결과와 동일)
npm run preview

# 린트
npm run lint
```

> `npm run preview` = `tsc -b && vite build && vite preview` — 실제 빌드 산출물을 로컬에서 서빙하므로 Vercel 배포 결과와 동일하게 동작합니다.

---

## 환경 변수

| 파일 | 용도 |
|---|---|
| `.env` | 공통 기본값 |
| `.env.development` | 로컬 dev 서버 전용 |
| `.env.production` | Vercel 빌드 전용 |

스프라이트 생성 스크립트를 사용하려면 `.env`에 `GEMINI_API_KEY`를 설정해야 합니다.

---

## 프로젝트 구조

```
src/
├── app/
│   ├── store/
│   │   ├── playerStore.ts      # 플레이어 데이터, 24개 유닛, 덱 5슬롯
│   │   └── battleStore.ts      # 전투 결과 상태
│   └── ui/
│       ├── App.tsx             # 화면 전환 (로비 / 전투 / 결과)
│       ├── PhaserGame.tsx      # Phaser 캔버스 React 래퍼
│       ├── LobbyScreen.tsx     # 덱 편성 화면 (HTML5 Drag & Drop)
│       ├── BattleResultScreen.tsx  # 전투 결과 모달
│       └── components/
│           ├── TopBar.tsx          # 자원 / 명성 / 계급 상단 바
│           ├── UnitCard.tsx        # 유닛 카드 (드래그 소스)
│           ├── DeckSlot.tsx        # 덱 슬롯 (드롭 대상)
│           ├── BattleStartButton.tsx
│           └── SwipeZone.tsx       # 스와이프 명령 입력 영역
├── game/
│   ├── core/
│   │   ├── EventBus.ts         # React-Phaser 양방향 이벤트 버스
│   │   ├── Game.ts             # Phaser.Game 인스턴스 (390×480, RESIZE)
│   │   └── SceneManager.ts     # 씬 전환 헬퍼
│   ├── entities/
│   │   ├── Unit.ts             # 유닛 기본 클래스 (Arcade.Sprite 상속)
│   │   ├── UnitFactory.ts      # 4종 유닛 생성 + 기본 스탯
│   │   ├── Projectile.ts       # 투사체 (Object Pool 관리)
│   │   └── ObjectPool.ts       # 제네릭 오브젝트 풀
│   ├── scenes/
│   │   ├── BattleScene.ts      # 전투 씬 (거점, 유닛 스폰, 승패 판정)
│   │   └── LoadingScene.ts     # 에셋 로딩 씬
│   └── systems/
│       ├── AutoAI.ts           # 자동 전투 AI (적 타겟팅, 거점 이동)
│       ├── CommandSystem.ts    # 스와이프 명령 처리
│       └── SkillSystem.ts      # 4종 스킬 (돌진/포격/폭격/힐)
├── components/
│   └── ui/                     # shadcn/ui 컴포넌트 (button, badge, separator)
├── types/
│   └── index.ts                # 전체 TypeScript 인터페이스 (유일한 타입 정의 파일)
├── lib/
│   └── utils.ts
└── main.tsx
```

---

## 전투 화면 레이아웃 (390×844, 세로 전용)

```
┌──────────────────────────┐
│  타이머        점수/모드   │  <- 상단 HUD (~120px)
├──────────────────────────┤
│    적 거점 (195, 80)      │
│                          │
│  <- Phaser 맵 390×480 -> │  <- Phaser 캔버스 (Z-0, 절대 위치)
│                          │
│    중립 거점 (195, 240)   │
│                          │
│    아군 거점 (195, 400)   │
├──────────────────────────┤
│[스킬1][스킬2][스킬3][스킬4][오토]│  <- 스킬 버튼
├──────────────────────────┤
│      스와이프 명령 존       │  <- 하단 조작 영역 (~180px)
└──────────────────────────┘
```

---

## 스킬 시스템

| 병과 | 스킬 | 쿨타임 | 효과 |
|---|---|---|---|
| 보병 | 돌진 (charge) | 8초 | 보병 전체 2초간 속도 2배 |
| 전차 | 포격 (barrage) | 12초 | 지정 범위 내 적 전체 데미지 |
| 공군 | 폭격 (airstrike) | 15초 | 가장 큰 적 집단에 광역 폭격 |
| 특수 | 힐 (heal) | 10초 | HP 가장 낮은 아군 유닛 50% 회복 |

---

## 승패 판정

OR 조건으로 승리 판정합니다:
- 적 유닛 전멸
- 거점 2개 이상 점령

제한 시간 초과 또는 아군 유닛 전멸 시 패배합니다.

---

## 버그 수정 이력

### 즉시 승리 화면 버그 (2026-02-26 수정)

**증상**: 전투 시작 직후 경과 00:00, 생존 0개로 즉시 "승리!" 화면이 표시됨.

**원인**: `BattleScene.update()` 루프가 `create()` 완료 직후부터 실행되어, `battle:start` 이벤트(유닛 스폰)를 수신하기 전에 `checkWinCondition()`이 호출됨. 이때 `enemyUnits`가 빈 배열이므로 `enemyAlive === 0` 조건이 즉시 충족되어 `endBattle('win')`이 호출됨.

**해결**: `battleStarted` 플래그 추가. `battle:start` 이벤트에서 유닛 스폰 완료 후 `true`로 설정. `checkWinCondition()`과 `handleTimeUp()` 모두 이 플래그를 확인한 후에만 실행.

**수정 파일**: `src/game/scenes/BattleScene.ts`

---

## 개발 현황 (Phase 0 — 완료)

| Task | 내용 | 상태 |
|---|---|---|
| Task 1 | 프로젝트 아키텍처 구축 (Vite, EventBus, Zustand, Phaser 임베드) | 완료 |
| Task 2 | 로비 화면 — 덱 편성 (HTML5 Drag & Drop) | 완료 |
| Task 3 | Phaser BattleScene — 390×480 맵, 거점 3개, Object Pool | 완료 |
| Task 4 | 4종 유닛 클래스 (보병/전차/공군/특수), HP 바, 투사체 | 완료 |
| Task 5 | AutoAI + CommandSystem + 스와이프 명령 존 | 완료 |
| Task 6 | SkillSystem 4종 스킬 + 승패 판정 + 결과 화면 | 완료 |
| Task 7 | PWA (vite-plugin-pwa), Vercel 배포, vendor 청크 분리, 가로 방향 차단 | 완료 |

---

## 아키텍처 핵심 규칙

- Phaser 로직은 `game/` 폴더에만. React 파일에 Phaser 코드 작성 금지.
- React는 `PhaserGame` 컴포넌트 → EventBus 경유로만 Phaser와 통신.
- React에서 Phaser 인스턴스 직접 참조 금지.
- 상태관리는 Zustand만 사용.
- 타입은 `types/index.ts` 한 곳에만 정의.
- `update()` 루프 내 `new` 객체 생성 금지 (Object Pool 사용).

---

## Phase 1+ 로드맵 (예정)

| 시스템 | 내용 |
|---|---|
| 영토 지도 | 수도에서 시작, 인접 영토 점령 세계 지도. 최종 목표: 국왕 거점 점령. |
| 국가 기술 연구 | 발전 / 경제 / 전투 3종 트리. 자원 기부로 유닛 스탯 / 자원 획득량 / 거점 강화. |
| 자원 기부 & 기부포인트 | 기부포인트 누적 → 계급 승급, 특수 유닛 해금. |
| 연맹 & 왕국 점령 이벤트 | 연맹(길드) 단위 참전. 점령 성공 연맹 대표가 국왕으로 등극. |
| 멀티플레이 | Colyseus 서버 연동 (Phase 2+). |

---

## 라이선스

MIT
