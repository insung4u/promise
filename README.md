# 머나먼약속 (A Distant Promise)

> 택티컬 커멘더스 느낌의 모바일 RTS — 5유닛 매크로 컨트롤 + 오토 전투 + 터치 명령

---

## 소개

**머나먼약속**은 서버 없이 싱글플레이어로 즐기는 모바일 RTS 게임입니다.

복잡한 유닛 조작 없이, 스와이프 한 번으로 부대 전체를 지휘하고 스킬 타이밍만 잘 맞추면 전투를 승리로 이끌 수 있습니다. 빠른 판단과 매크로 컨트롤의 재미를 모바일에서 체감하는 것을 목표로 합니다.

---

## 핵심 특징

- **풀 오토 전투** — AI가 자동으로 가장 가까운 적을 공격하고 거점을 점령
- **스와이프 명령** — 화면 왼쪽을 쓸어 전진 / 후퇴 / 좌우 집결을 한 번에 지시
- **4종 병과** — 보병 / 전차 / 공군 / 특수의 조합으로 덱 편성
- **스킬 시스템** — 돌진 · 포격 · 폭격 · 힐, 쿨타임을 노린 한 방
- **덱 편성** — 24개 유닛 중 5개를 골라 나만의 전략 구성

---

## 스크린샷

> 개발 중입니다.

---

## Tech Stack

| 역할 | 기술 |
|---|---|
| 번들러 | Vite 5.4+ |
| UI | React 19 + TailwindCSS 3.4 + shadcn/ui |
| 언어 | TypeScript 5.6 |
| 게임 엔진 | Phaser 3.80+ (WebGL2, Arcade Physics) |
| 상태관리 | Zustand 4.5 |
| 통신 | EventEmitter3 (React ↔ Phaser) |
| 모바일 | Capacitor 6 (PWA → 앱) |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드 후 로컬 미리보기 (Vercel 배포 결과와 동일)
npm run preview
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── store/      # Zustand 상태 관리
│   └── ui/         # React 화면 컴포넌트
├── game/
│   ├── core/       # Phaser Game, EventBus, SceneManager
│   ├── entities/   # Unit, UnitFactory, Projectile
│   ├── scenes/     # BattleScene, LoadingScene
│   └── systems/    # AutoAI, CommandSystem, SkillSystem
└── types/          # 전체 TypeScript 인터페이스 정의
```

---

## 개발 현황 (Phase 0)

- [ ] Task 1 — 프로젝트 아키텍처 구축
- [ ] Task 2 — 로비 화면 (덱 편성)
- [ ] Task 3 — Phaser BattleScene 기본
- [ ] Task 4 — 4종 유닛 구현
- [ ] Task 5 — AutoAI + 스와이프 명령
- [ ] Task 6 — 스킬 시스템 + 승패 판정
- [ ] Task 7 — PWA + Vercel 배포

---

## 라이선스

MIT
