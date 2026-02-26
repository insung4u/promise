# PM Agent Memory — 머나먼약속

## 확정된 설계 결정사항

### Unit 상속 구조 (확정)
- `Phaser.Physics.Arcade.Sprite` 상속 (Container 아님)
- 근거: Arcade Physics 직접 활용, 10유닛 60FPS 목표에 최적
- 수정 완료: docs/task-4.md

### 화면 방향 및 해상도 (확정)
- 모바일 세로형(Portrait)만 지원. 가로형 제작 안 함.
- 전체 앱 해상도: 390×844 기준 (iPhone 14) — 실제 컨테이너는 max-w-[430px] 유동 대응
- Phaser 맵: 고정 크기 대신 width: '100%', height: '100%' + RESIZE 스케일 모드 (풀스크린)
- 수정 완료: CLAUDE.md, docs/prd.md, docs/task-3.md, src/game/core/Game.ts

### App.tsx 레이아웃 구조 (확정, 안티그래비티 리팩토링 반영)
- 최상위: `fixed inset-0` 컨테이너 (모바일 Safari 주소창 대응)
- 게임 컨테이너: `relative w-full h-full max-w-[430px] mx-auto` (iPhone 15 Pro 등 넓은 화면 대응)
- Phaser 캔버스: `absolute inset-0 z-0` (뒤쪽 풀스크린)
- UI 오버레이: `absolute inset-0 z-10 flex flex-col pointer-events-none`
  - 상단 HUD: h-[120px] + pt safe-area-inset-top
  - 하단 UI: h-[180px] + pb safe-area-inset-bottom
- 수정 완료: src/app/ui/App.tsx

### 거점 좌표 (확정, 세로형 390×480 맵 기준)
- 적 거점: (195, 80) — 맵 상단 중앙
- 중립 거점: (195, 240) — 맵 중앙
- 아군 거점: (195, 400) — 맵 하단 중앙
- 수정 완료: docs/task-3.md, .claude/agents/scene-agent.md

### 스와이프 좌표 기준값 (확정, 세로형 기준 재확정)
- task-5.md / ai-agent.md / CommandSystem.ts 통일 완료
- up: (195, 80), down: (195, 400), left: (80, 240), right: (310, 240), center: (195, 240)
- 세로형 맵(390×480) 거점 좌표 기반으로 변경됨 (구: 가로형 800×600 기준)

### 승패 판정 조건 (확정)
- OR 조건 채택: 적 전멸 OR 거점 2개 이상 점령 → 승리
- 근거: MVP 재미 검증 목적, AND 조건은 너무 어려움
- 수정 완료: docs/task-6.md, .claude/agents/skill-agent.md

### 스킬 쿨타임 & 효과 (확정)
| 스킬 | 쿨타임 | 효과 |
|---|---|---|
| 돌진 (charge) | 8초 | 보병 전체 2초간 속도 2배 |
| 포격 (barrage) | 12초 | 지정 범위 내 적 전체 데미지 |
| 폭격 (airstrike) | 15초 | 가장 큰 적 집단에 광역 폭격 |
| 힐 (heal) | 10초 | HP 가장 낮은 아군 유닛 50% 회복 |
- 수정 완료: docs/task-6.md, .claude/agents/skill-agent.md

## Task 진행 현황
- Task 1: 완료 (2026-02-25) — architect-agent 역할 PM이 직접 수행
- Task 2: 완료 (2026-02-26) — ui-agent 역할 PM이 직접 수행
- Task 3: 완료 (2026-02-26) — scene-agent 역할 PM이 직접 수행
- Task 4: 완료 (2026-02-26) — Unit/UnitFactory/Projectile/BattleScene 스폰 로직 구현
- Task 5: 완료 (2026-02-26) — AutoAI, CommandSystem, SwipeZone, App.tsx BattleHUD/BattleControls 구현
- Task 6: 완료 (2026-02-26) — SkillSystem 4종 스킬 + 승패 판정 + 스킬 버튼 쿨타임 UI
- Task 7: 완료 (2026-02-26) — vite-plugin-pwa(Workbox), vercel.json 캐시 헤더, vendor 청크, .env 3종, canvas touch-action, AutoAI _aliveEnemyCache 최적화
- Phase 0 MVP 전체 완료
- 문서 정합성 검토 완료 (2026-02-25)
- 안티그래비티 작업: AGENTS.md, GEMINI.md 추가, App.tsx 풀스크린 리팩토링, Game.ts RESIZE 모드 변경 (2026-02-26)

## Task 1 주요 결정사항
- `@types/node` devDependency 추가 필요 (vite.config.ts의 path, __dirname, process 사용)
- tsconfig.node.json에 `"types": ["node"]` 추가 필수
- src/lib/utils.ts에 getDirectionKey 포함 (현재 placeholder: 항상 E 반환)
- 스텁 파일 모두 생성됨: BattleScene, LoadingScene, Unit, UnitFactory, Projectile, AutoAI, CommandSystem, SkillSystem

## 생성된 파일 (Task 1)
루트: package.json, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json,
      tailwind.config.js, postcss.config.js, index.html, vercel.json
src/: main.tsx, index.css
src/types/: index.ts
src/lib/: utils.ts
src/app/store/: playerStore.ts, battleStore.ts
src/app/ui/: App.tsx, PhaserGame.tsx
src/game/core/: EventBus.ts, Game.ts, SceneManager.ts
src/game/scenes/: LoadingScene.ts, BattleScene.ts
src/game/entities/: Unit.ts, UnitFactory.ts, Projectile.ts
src/game/systems/: AutoAI.ts, CommandSystem.ts, SkillSystem.ts

## 버그 수정 이력

### 즉시 승리 버그 (2026-02-26)
- **증상**: 전투 시작 시 즉시 "승리!" 화면 (경과 00:00, 생존 0개)
- **원인**: `BattleScene.update()` 루프가 `create()` 직후부터 실행되어,
  `battle:start` 이벤트(유닛 스폰)를 받기 전에 `checkWinCondition()`이 호출됨.
  이때 `enemyUnits`가 빈 배열 → `enemyAlive === 0` → 즉시 `endBattle('win')`
- **해결**: `battleStarted` 플래그 추가. `battle:start` 이벤트에서 유닛 스폰 완료 후
  `true`로 설정. `checkWinCondition()` / `handleTimeUp()` 모두 이 플래그 체크 후 실행.
- **수정 파일**: `src/game/scenes/BattleScene.ts`
- **교훈**: Phaser `update()` 루프는 `create()` 완료 직후부터 실행된다.
  게임 로직은 실제 시작 플래그 없이 배열 길이만으로 상태를 판단하면 안 된다.

## 다음 단계
Phase 0 MVP 완료. 다음 선택지:
- Vercel 실배포: GitHub main 브랜치 push → Vercel 자동 배포
- 실기기 테스트: npm run preview → 로컬 QA
- Phase 1 착수: 영토 지도 시스템 / 서버(Colyseus) 연동 설계

## 수정된 파일 목록
- docs/task-4.md
- docs/task-6.md
- .claude/agents/ai-agent.md
- .claude/agents/skill-agent.md
- CLAUDE.md (세로형 레이아웃 다이어그램)
- docs/prd.md (섹션 5 전투 화면 + 거점 좌표 + 맵 해상도)
- docs/task-3.md (맵 크기 390×480, 거점 좌표)
- docs/task-5.md (스와이프 좌표, SwipeZone 위치)
- src/game/core/Game.ts (width: 390, height: 480)
- src/game/systems/CommandSystem.ts (DIRECTION_TARGETS 세로형 좌표)
- .claude/agents/scene-agent.md (맵 크기, 거점 좌표, 스와이프 존 위치)

### Task 6 주요 결정사항 (2026-02-26)
- `battle:hud` 페이로드에 `skillCooldownRatios: [number,number,number,number]` 추가
- App.tsx 리팩토링: BattleHUD + BattleControls → `BattleView`(부모)로 상태 통합
  - BattleView가 'battle:hud' 단일 구독 후 props로 전달 (중복 구독 제거)
- SkillSystem: 스킬-유닛 타입 매핑(infantry→charge, tank→barrage, air→airstrike, special→heal)
- SkillSystem: `skillIndex` 기반(덱 인덱스 0~3)으로 발동 유닛 결정
- BattleScene: `battleEnded` 플래그로 endBattle() 중복 호출 방지
- BattleScene: `maxTime` 멤버 추가 (timeElapsed 계산용)
- 승패 판정 구현: checkWinCondition() 매 프레임 체크 + handleTimeUp() 시간초과 처리
- 빌드 결과: tsc --noEmit 0건, npm run build 성공 (7.34s)

### Task 5 주요 결정사항 (2026-02-26)
- `battle:hud` 이벤트 페이로드: `{ timeLeft, playerCount, enemyCount }` (점령 거점 수 아닌 생존 유닛 수)
- types/index.ts GameEvents 및 BattleScene.ts 통일 완료 (`playerScore/enemyScore` → `playerCount/enemyCount`)
- BattleHUD: useState(600) 기본값 → EventBus 'battle:hud' 구독으로 실시간 갱신
- BattleControls 오토 버튼: useState(true) → 클릭 시 setAutoMode + EventBus.emit('battle:autoToggle')
- SwipeZone: `src/app/ui/components/SwipeZone.tsx` (touch passive 리스너, 20px 임계값)
- 빌드 결과: tsc --noEmit 0건, npm run build 성공 (7.14s)

### Task 2, 3 주요 결정사항 (2026-02-26)
- tsconfig.app.json에 `"types": ["vite/client"]` 추가 필수 (import.meta.env 타입 인식)
- LoadingScene: `this.make.graphics({ add: false })` → `this.add.graphics()` (Phaser 3.80+ 호환)
- shadcn/ui 수동 설치: class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot, lucide-react
- shadcn/ui 컴포넌트 위치: `src/components/ui/` (CLAUDE.md 폴더 구조 확장)
- playerStore: 24개 유닛 (4종 × 6티어, 티어별 1.2^(tier-1) 스탯 배율)
- App.tsx 화면 전환: 로비(Phaser 위 오버레이) / 전투(HUD 오버레이만) / 결과(모달)
- LobbyScreen: HTML5 Drag API 전용, react-dnd 미사용

### Task 1 소스 코드 세로형 반영 + P1 수정 (2026-02-25)
- src/game/scenes/BattleScene.ts: 임시 텍스트 좌표 (400,300) → (195,240)
- src/app/ui/App.tsx: 컨테이너 w-[800px] h-[600px] → w-[390px] h-[844px]
- src/app/store/playerStore.ts: makeUnit() 스탯 중복 제거, UnitFactory.getDefaultData() 위임 (P1-1)
- src/game/entities/Unit.ts: takeDamage() this.destroy() → setActive(false)/setVisible(false) (P1-2)
- 빌드 결과: tsc --noEmit 0건, npm run build 성공

### Object Pool 패턴 규칙 (Unit.takeDamage)
- Unit 사망 시 destroy() 직접 호출 금지
- setActive(false) + setVisible(false) 로 비활성화 → BattleScene Pool이 회수
- Task 4 unit-agent에서 BattleScene Pool 회수 로직 구현 예정

## PWA 및 아이콘 설정 완료 (2026-02-25)
- **deploy-agent / sprite-agent 혼합 작업 완료** (실제 배포 전 로컬 세팅)
- **아이콘**: Google AI (Imagen 4)를 이용해 3D 기사 얼굴(클래시 로얄 스타일) 아이콘(`app_icon.jpeg`) 생성 후, `sharp`를 통해 PWA용 PNG(`icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`)로 변환 완료.
- **다국어 매니페스트**: 기기 언어 설정에 따라 `manifest.json` 혹은 `manifest_en.json`을 사용하려 했으나, PWA 안정적인 설치 트리거를 위해 기본 `manifest.json`으로 롤백하여 한국어 고정 유지. 대신 브라우저 탭 타이틀은 자바스크립트로 다국어 처리.
- **가로 회전 방지 (Portrait Lock)**:
  1. `manifest.json` 내에 `"orientation": "portrait"` 추가 (홈 화면 추가 시 강제)
  2. `index.html` 내에 `screen.orientation.lock('portrait')` JS 락 시도 추가
  3. `index.css` 및 `index.html` 내에 폰을 가로로 뉘일 시 `#landscape-warning` 오버레이 뷰를 띄워 강제로 시야 차단하는 최후통첩 로직 구현.
