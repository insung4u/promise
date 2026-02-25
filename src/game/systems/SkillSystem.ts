import type { SkillType } from '@/types';

// 스킬 시스템 — 4종 스킬 쿨타임 및 발동 관리
// Task 6(skill-agent)에서 실제 스킬 효과가 구현된다.

// 스킬별 쿨타임 (초 단위) — task-6.md 기준
const SKILL_COOLDOWNS: Record<SkillType, number> = {
  charge:    8,   // 보병 전체 2초간 속도 2배
  barrage:   12,  // 지정 범위 내 적 전체 데미지
  airstrike: 15,  // 가장 큰 적 집단에 광역 폭격
  heal:      10,  // HP 가장 낮은 아군 유닛 50% 회복
};

export class SkillSystem {
  // 스킬 타입별 남은 쿨타임 (초)
  private cooldownTimers: Record<SkillType, number> = {
    charge: 0,
    barrage: 0,
    airstrike: 0,
    heal: 0,
  };

  // 스킬 발동 가능 여부 확인
  canActivate(skillType: SkillType): boolean {
    return this.cooldownTimers[skillType] <= 0;
  }

  // 스킬 발동
  activate(skillType: SkillType): void {
    if (!this.canActivate(skillType)) return;
    this.cooldownTimers[skillType] = SKILL_COOLDOWNS[skillType];
    // Task 6에서 실제 스킬 효과 로직 추가
  }

  // 매 프레임 쿨타임 감소
  update(delta: number): void {
    const deltaSeconds = delta / 1000;
    (Object.keys(this.cooldownTimers) as SkillType[]).forEach((skill) => {
      if (this.cooldownTimers[skill] > 0) {
        this.cooldownTimers[skill] = Math.max(0, this.cooldownTimers[skill] - deltaSeconds);
      }
    });
  }

  getCooldown(skillType: SkillType): number {
    return this.cooldownTimers[skillType];
  }

  getMaxCooldown(skillType: SkillType): number {
    return SKILL_COOLDOWNS[skillType];
  }
}
