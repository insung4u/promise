# 머나먼약속 (A Distant Promise)
## Phase 0 – 클라이언트-only MVP (서버 완전 제외 버전)

---

## 1. 프로젝트 목표

서버 없이 싱글플레이어로 "택티컬 커멘더스 느낌 나는 모바일 RTS"를 가장 빠르게 체감할 수 있게 한다.

- 5유닛 매크로 컨트롤 + 오토 전투 + 터치 명령이 재미있고 직관적인지 검증
- 나중에 Colyseus 붙일 때 거의 그대로 확장 가능하도록 아키텍처 설계

---

## 2. Tech Stack

| 패키지 | 버전 |
|---|---|
| Vite | 5.4+ |
| React | 19 |
| TypeScript | 5.6 |
| Phaser | 3.80+ (WebGL2 강제, Arcade Physics) |
| Zustand | 4.5 |
| TailwindCSS | 3.4 |
| shadcn/ui | latest |
| EventEmitter3 | latest (React ↔ Phaser 양방향 통신 전용) |
| Hammer.js | latest (또는 Phaser 내장 Touch) |
| Capacitor | 6 (PWA → 앱 변환 준비) |

---

## 3. 폴더 구조

```
src/
├── app/                  # React 라우터 + Zustand 스토어
│   ├── store/            # zustand slices (playerStore, battleStore 등)
│   └── ui/               # 로비 화면 컴포넌트들
├── game/                 # Phaser 관련 전용 폴더
│   ├── core/
│   │   ├── Game.ts
│   │   ├── EventBus.ts
│   │   └── SceneManager.ts
│   ├── entities/
│   │   ├── Unit.ts
│   │   ├── UnitFactory.ts
│   │   └── Projectile.ts
│   ├── scenes/
│   │   ├── BattleScene.ts
│   │   └── LoadingScene.ts
│   └── systems/
│       ├── AutoAI.ts
│       ├── CommandSystem.ts
│       └── SkillSystem.ts
├── types/
│   └── index.ts          # 모든 인터페이스 정의
├── lib/
│   └── utils.ts
└── main.tsx
```

---

## 4. 핵심 데이터 모델 (`types/index.ts`)

```typescript
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

export interface PlayerData {
  resources: number;
  fame: number;
  rank: 'soldier' | 'general' | 'marquis' | 'duke';
  allUnits: UnitData[];        // 최대 24개
  deck: UnitData[];            // 정확히 5개
}

export interface CapturePoint {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
}
```

---

## 5. 화면 구성 (모바일 세로 기준)

### 로비 화면 (React)
- 상단 바: 자원 아이콘(🪙), 명성(⭐), 계급 아이콘
- 중앙: 24유닛 그리드 (드래그 & 드롭으로 덱에 넣기)
- 우측: 현재 덱 5슬롯 (드롭 가능)
- 하단 큰 버튼: "전투 시작" (덱 5개 미만이면 비활성화)

### 전투 화면 (Phaser Canvas)
- 전체 800x600 맵 (배경: 풀 + 길 + 산)
- 거점 3개: 좌상(적), 중앙(중립), 우하(아군 시작)
- 왼쪽 30% 영역: 스와이프 명령 존 (4방향 + 중앙 집결)
- 오른쪽 하단 4개 스킬 버튼 + 오토/수동 토글
- 상단: 남은 시간 + 점수

---

## 6. 컨트롤 상세 규칙

- **기본 모드**: 풀 오토 (AI가 자동 공격 + 거점 이동)

### 스와이프 명령 (왼쪽 30% 영역)
| 제스처 | 동작 |
|---|---|
| ↑ 위 스와이프 | 전체 유닛 전진 (적 진영 방향) |
| ↓ 아래 스와이프 | 전체 후퇴 (아군 거점 방향) |
| ← 왼쪽 스와이프 | 좌 집결 |
| → 오른쪽 스와이프 | 우 집결 |
| 중앙 탭 | 현재 위치에 집결 |

- **스킬 버튼**: 덱 순서대로 1~4번 유닛의 궁극기 (쿨타임 표시)
- **오토 토글**: ON이면 AI만, OFF면 명령만 받음

---

## 7. MVP 개발 Task 순서

| # | Task | 설명 |
|---|---|---|
| 1 | 프로젝트 생성 및 아키텍처 구축 | Vite 프로젝트 생성, 폴더 구조, EventBus, Zustand 스토어, Phaser Canvas React 임베드 |
| 2 | 로비 화면 완성 | Tailwind + shadcn UI, 드래그&드롭 덱 편성 (HTML5 drag API) |
| 3 | Phaser BattleScene 기본 | 800x600 맵, 배경, 3개 거점 스프라이트, Object Pool 20개 |
| 4 | Unit 클래스 & 4종 유닛 | 병과별 스프라이트, 이동, 공격 애니메이션, HP 바 |
| 5 | AutoAI + CommandSystem | 가장 가까운 적 공격 + 거점 우선순위, 스와이프 명령 → 전체 유닛 moveTo 큐잉 |
| 6 | SkillSystem & 승패 판정 | 4종 스킬 효과, 승리 조건 달성 시 보상 화면 전환 |
| 7 | PWA + 모바일 최적화 | manifest.json, 터치 이벤트, 60FPS, Object Pooling |

### Task 6 스킬 예시
| 병과 | 스킬 |
|---|---|
| 보병 | 돌진 |
| 전차 | 포격 |
| 공군 | 폭격 |
| 특수 | 힐 |

---

## 8. 배포 및 환경 설정

### Vercel 배포 + 로컬 개발 동일 동작 보장

`npm run dev`와 `npm run preview` 두 모드에서 동일하게 동작해야 한다.

#### 요구사항
- `vite.config.ts`의 `base` 경로를 환경변수로 제어 (기본 `/`)
- `npm run preview`는 `vite build && vite preview`로 실행되도록 설정
- Phaser의 asset 경로는 절대 경로(`/assets/...`) 대신 `import.meta.env.BASE_URL` 기반으로 처리
- 환경변수 파일 구성:

```
.env                 # 공통 기본값
.env.development     # 로컬 dev 서버 전용
.env.production      # Vercel 빌드 전용
```

- Vercel `vercel.json`에서 SPA 라우팅 fallback 설정 필수:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

#### `package.json` scripts 규칙
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite build && vite preview",
    "lint": "eslint ."
  }
}
```

> **핵심 원칙**: `preview`는 실제 빌드 산출물을 로컬에서 서빙하므로 Vercel 배포 결과와 동일한 동작을 보장한다.

---

## 9. 아키텍처 규칙 (Claude 준수 사항)

- 모든 Phaser 로직은 `game/` 폴더에만 작성
- React는 `PhaserGame` 컴포넌트를 통해서만 EventBus로 통신
- **성능**: 모바일 저사양 기준 — 10유닛 + 20발 투사체에서도 60FPS 유지
- **코드 스타일**: TypeScript strict 모드, 함수형 컴포넌트, Zustand만 사용
- **주석**: 각 클래스와 중요한 함수 위에 한글 주석 필수
