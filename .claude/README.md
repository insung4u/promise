# .claude 디렉토리 가이드 — 머나먼약속

이 디렉토리는 Claude Code가 사용하는 모든 설정과 에이전트를 관리한다.

---

## 디렉토리 구조

```
.claude/
├── README.md          ← 이 파일 (디렉토리 전체 가이드)
├── commands/
│   └── pm.md          ← /pm 슬래시 커맨드
├── agents/            ← Sub-agent 정의 파일 (13개)
│   ├── pm-agent.md          ← PM (사용자는 이것만 호출)
│   ├── architect-agent.md
│   ├── ui-agent.md
│   ├── scene-agent.md
│   ├── unit-agent.md
│   ├── ai-agent.md
│   ├── skill-agent.md
│   ├── deploy-agent.md
│   ├── bridge-agent.md
│   ├── types-agent.md
│   ├── performance-agent.md
│   ├── asset-agent.md
│   └── test-agent.md
└── agent-memory/      ← 에이전트 자동 학습 기록 (자동 생성됨)
    ├── pm-agent/
    │   └── MEMORY.md  ← Task 진행 상황, 아키텍처 결정, 다음 단계
    ├── architect-agent/
    │   └── MEMORY.md  ← 초기 세팅 결정사항
    ├── bridge-agent/
    │   └── MEMORY.md  ← 확정된 EventBus 이벤트 패턴
    ├── types-agent/
    │   └── MEMORY.md  ← 타입 변경 이력
    └── performance-agent/
        └── MEMORY.md  ← 발견된 성능 이슈와 해결책
```

---

## 사용법 (핵심)

**사용자는 `pm-agent`에게만 지시한다.**
PM이 나머지 sub-agent를 알아서 호출하고 조율한다.

```
사용자 → pm-agent → architect-agent
                  → ui-agent
                  → scene-agent
                  → unit-agent
                  → ai-agent / skill-agent
                  → deploy-agent
                  → (지원 에이전트들)
```

---

## Sub-agent 사용 가이드

### 핵심 개발 에이전트 (Task 순서대로 호출)

| 에이전트 | 파일 | 호출 시점 | 담당 Task |
|---|---|---|---|
| `architect-agent` | `agents/architect-agent.md` | 프로젝트 시작 시 | Task 1: 초기 세팅 + EventBus + Zustand |
| `ui-agent` | `agents/ui-agent.md` | architect 완료 후 | Task 2: 로비 화면 + 드래그&드롭 덱 |
| `scene-agent` | `agents/scene-agent.md` | architect 완료 후 | Task 3: BattleScene + 거점 + Pool |
| `unit-agent` | `agents/unit-agent.md` | scene 완료 후 | Task 4: 4종 유닛 클래스 |
| `ai-agent` | `agents/ai-agent.md` | unit 완료 후 | Task 5: AutoAI + CommandSystem |
| `skill-agent` | `agents/skill-agent.md` | unit 완료 후 | Task 6: 스킬 + 승패 판정 |
| `deploy-agent` | `agents/deploy-agent.md` | 마지막 단계 | Task 7: PWA + Vercel 배포 |

### 지원 에이전트 (상황에 따라 호출)

| 에이전트 | 파일 | 호출 시점 |
|---|---|---|
| `bridge-agent` | `agents/bridge-agent.md` | EventBus 통신 설계 또는 이벤트 버그 발생 시 |
| `types-agent` | `agents/types-agent.md` | 타입 변경, `tsc` 에러 다수 발생 시 |
| `performance-agent` | `agents/performance-agent.md` | FPS 저하, 메모리 누수 의심 시 |
| `asset-agent` | `agents/asset-agent.md` | placeholder 스프라이트/애셋 필요 시 |
| `test-agent` | `agents/test-agent.md` | 핵심 로직 검증, 버그 재현 테스트 필요 시 |

---

## 에이전트 실행 순서 의존성

```
architect-agent          ← 모든 에이전트의 기반, 가장 먼저 실행
    ├── ui-agent
    │     └── bridge-agent
    └── scene-agent
          └── unit-agent
                ├── ai-agent
                └── skill-agent

deploy-agent             ← 독립 실행 (마지막 단계)

types-agent              ← 언제든 독립 실행 가능
performance-agent        ← 언제든 독립 실행 가능
asset-agent              ← 언제든 독립 실행 가능
test-agent               ← 언제든 독립 실행 가능
```

---

## 각 에이전트 파일 구성

모든 에이전트 파일은 아래 구조를 따른다:

```markdown
---
name: 에이전트-이름
description: 호출 시점과 역할 설명 (Claude가 자동 선택 시 참고)
tools: 허용된 도구 목록
---

# 에이전트 역할 설명
## 담당 Task
## 구현 대상 파일 목록
## 핵심 인터페이스/패턴 코드
## 금지 패턴
## 완료 기준 체크리스트
```

---

## 에이전트 추가/수정 방법

1. `agents/` 디렉토리에 `{이름}-agent.md` 파일 생성
2. YAML frontmatter에 `name`, `description`, `tools` 작성
3. 이 README의 에이전트 목록과 의존성 다이어그램 업데이트
4. `CLAUDE.md`의 MVP Task 순서에 반영 필요 시 업데이트
