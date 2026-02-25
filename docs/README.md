# docs/ — 머나먼약속 문서 디렉토리

---

## 파일 목록

### 기획 문서

| 파일 | 설명 |
|---|---|
| [`prd.md`](./prd.md) | **Product Requirements Document** — 프로젝트 목표, Tech Stack, 폴더 구조, 데이터 모델, 전투 모드, 배포 규칙, Phase 1+ 로드맵 |
| [`game-systems-reference.md`](./game-systems-reference.md) | **게임 시스템 레퍼런스** — 클래시 오브 킹즈 참고 자료. 유닛 스탯 수치(공/방/체/사거리/속도/적재/식량소모), 건물 체계, 자원 종류, 계급 버프, 기술 연구 트리 |

---

### Task 문서 (개발 착수 전 반드시 읽기)

> 각 Task 착수 전 해당 문서를 읽고 계획을 확인한다. 즉시 코드 작성 금지.

| 파일 | Task | 담당 에이전트 | 의존성 |
|---|---|---|---|
| [`task-1.md`](./task-1.md) | 프로젝트 생성 + 아키텍처 구축 | `architect-agent` | 없음 (첫 번째) |
| [`task-2.md`](./task-2.md) | 로비 화면 (덱 편성 UI) | `ui-agent` | Task 1 |
| [`task-3.md`](./task-3.md) | Phaser BattleScene 기본 | `scene-agent` | Task 1 |
| [`task-4.md`](./task-4.md) | Unit 클래스 + 4종 유닛 | `unit-agent` | Task 3 |
| [`task-5.md`](./task-5.md) | AutoAI + CommandSystem | `ai-agent` | Task 4 |
| [`task-6.md`](./task-6.md) | SkillSystem + 승패 판정 | `skill-agent` | Task 4, 5 |
| [`task-7.md`](./task-7.md) | PWA + 배포 최적화 | `deploy-agent` | Task 1~6 |

---

## Task 의존성 흐름

```
Task 1 (아키텍처)
├── Task 2 (로비 UI)          ← Task 1 완료 후, Task 3과 병렬 가능
└── Task 3 (BattleScene)      ← Task 1 완료 후, Task 2와 병렬 가능
        └── Task 4 (유닛)
                └── Task 5 (AutoAI)
                        └── Task 6 (스킬/승패)
                                    └── Task 7 (배포)
```

---

## 관련 루트 문서

| 파일 | 설명 |
|---|---|
| `../CLAUDE.md` | Claude Code 프로젝트 지침 (아키텍처 규칙, 개발 워크플로) |
| `../AGENTS.md` | 범용 AI 에이전트 가이드 (Gemini, Cursor, Antigravity 공통) |
| `../GEMINI.md` | Gemini CLI 전용 지침 |
| `../.cursorrules` | Cursor 레거시 규칙 |
| `../.cursor/rules/promise.mdc` | Cursor 신규 포맷 규칙 |
| `../.claude/README.md` | Sub-agent 목록 및 실행 순서 |
