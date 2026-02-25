// AutoAI 시스템 — 유닛 자동 전투 AI
// Task 5(ai-agent)에서 실제 AI 로직이 구현된다.
// 자동 모드: 가장 가까운 적을 찾아 이동 및 공격
// 수동 모드: CommandSystem의 스와이프 명령 대기

export class AutoAI {
  private isAutoMode: boolean = true;

  // 자동/수동 모드 전환
  setAutoMode(auto: boolean): void {
    this.isAutoMode = auto;
  }

  isAuto(): boolean {
    return this.isAutoMode;
  }

  // 매 프레임 AI 업데이트 — Task 5에서 구현
  update(_delta: number): void {
    if (!this.isAutoMode) return;
    // Task 5에서 유닛 이동 및 타겟 설정 로직 추가
  }
}
