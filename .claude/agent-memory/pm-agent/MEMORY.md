# PM Agent Memory — 머나먼약속

## 확정된 설계 결정사항

### Unit 상속 구조 (확정)
- `Phaser.Physics.Arcade.Sprite` 상속 (Container 아님)
- 근거: Arcade Physics 직접 활용, 10유닛 60FPS 목표에 최적
- 수정 완료: docs/task-4.md

### 화면 방향 및 해상도 (확정)
- 모바일 세로형(Portrait)만 지원. 가로형 제작 안 함.
- 전체 앱 해상도: 390×844 (iPhone 14 논리 해상도)
- Phaser 맵 영역: 390×480 (HUD 60px + 스킬버튼 80px + 스와이프존 224px 제외)
- 수정 완료: CLAUDE.md, docs/prd.md, docs/task-3.md, src/game/core/Game.ts

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
- Task 2~7: 미착수
- 문서 정합성 검토 완료 (2026-02-25)

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

## 다음 단계
Task 2 (ui-agent): 로비 화면 + 덱 편성 UI
Task 3 (scene-agent): BattleScene 맵, 거점, Object Pool
Task 2, 3은 병렬 착수 가능 (Task 1 완료 기반)

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
