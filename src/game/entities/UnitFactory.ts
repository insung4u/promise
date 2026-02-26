import Phaser from 'phaser';
import type { UnitData, UnitType } from '@/types';
import { Unit } from './Unit';

/**
 * 유닛 타입별 Tier 1 기본 스탯 (task-4.md 기준)
 * 티어 배율은 TIER_MULT 배열로 별도 관리.
 */
const BASE_STATS: Record<UnitType, Omit<UnitData, 'id' | 'type' | 'tier' | 'position' | 'target' | 'skillCooldown' | 'isAlive'>> = {
  infantry: { hp: 100, maxHp: 100, attack: 10, defense: 14, speed: 80,  range: 1, cargo: 8,  foodCost: 0.21 },
  tank:     { hp: 120, maxHp: 120, attack: 18, defense: 8,  speed: 50,  range: 1, cargo: 13, foodCost: 0.42 },
  air:      { hp: 60,  maxHp: 60,  attack: 8,  defense: 6,  speed: 100, range: 5, cargo: 6,  foodCost: 0.62 },
  special:  { hp: 80,  maxHp: 80,  attack: 6,  defense: 10, speed: 70,  range: 3, cargo: 10, foodCost: 0.42 },
};

/**
 * 티어별 스탯 배율 (T1 ~ T6)
 * task-4.md: T1×1 / T2×1.8 / T3×3 / T4×5 / T5×8 / T6×12
 */
const TIER_MULT = [1, 1.8, 3, 5, 8, 12] as const;

/**
 * 유닛 팩토리
 *
 * 역할:
 *   1. getDefaultData() — 로비 playerStore에서 24개 유닛 초기화 시 사용
 *   2. create()         — BattleScene에서 Unit 인스턴스 생성 시 사용
 *
 * 스탯 계산 규칙:
 *   - 티어 배율은 hp/maxHp/attack/defense에 적용 (speed/range는 고정)
 *   - 배율 결과는 Math.round()로 정수화
 */
export class UnitFactory {
  /**
   * 유닛 타입과 ID로 기본 UnitData 객체를 반환한다.
   * 로비의 playerStore가 allUnits 24개를 초기화할 때 호출한다.
   * tier는 호출 측에서 덮어쓴다.
   */
  static getDefaultData(type: UnitType, id: string): UnitData {
    const base = BASE_STATS[type];
    return {
      id,
      type,
      tier:         1,
      hp:           base.hp,
      maxHp:        base.maxHp,
      attack:       base.attack,
      defense:      base.defense,
      speed:        base.speed,
      range:        base.range,
      cargo:        base.cargo,
      foodCost:     base.foodCost,
      skillCooldown: 0,
      isAlive:      true,
      position:     { x: 0, y: 0 },
    };
  }

  /**
   * UnitData → Unit 인스턴스 생성 (BattleScene에서 호출)
   *
   * @param scene    - 소속 Phaser.Scene
   * @param data     - 로비에서 넘어온 UnitData (tier 포함)
   * @param x        - 스폰 x 좌표
   * @param y        - 스폰 y 좌표
   * @param team     - 'player' | 'enemy'
   */
  static create(
    scene: Phaser.Scene,
    data: UnitData,
    x: number,
    y: number,
    team: 'player' | 'enemy',
  ): Unit {
    const base = BASE_STATS[data.type];
    const tier = Math.min(Math.max(data.tier, 1), 6);
    const mult = TIER_MULT[tier - 1];

    // 티어 배율 적용 스탯 계산
    const scaledData: UnitData = {
      ...data,
      position:  { x, y },
      hp:        Math.round(base.hp      * mult),
      maxHp:     Math.round(base.maxHp   * mult),
      attack:    Math.round(base.attack  * mult),
      defense:   Math.round(base.defense * mult),
      speed:     base.speed,   // speed는 배율 적용 안 함 (체감 속도 유지)
      range:     base.range,   // range도 고정
      isAlive:   true,
      skillCooldown: 0,
    };

    return new Unit(scene, x, y, scaledData, team);
  }

  /**
   * 적 AI 전용 UnitData 생성 헬퍼
   * id, type, tier를 받아 스탯이 계산된 UnitData를 반환한다.
   * BattleScene의 적 스폰 코드에서 사용.
   */
  static makeEnemyData(
    id: string,
    type: UnitType,
    tier: number,
    position: { x: number; y: number },
  ): UnitData {
    const base = BASE_STATS[type];
    const t    = Math.min(Math.max(tier, 1), 6);
    const mult = TIER_MULT[t - 1];

    return {
      id,
      type,
      tier:         t,
      hp:           Math.round(base.hp      * mult),
      maxHp:        Math.round(base.maxHp   * mult),
      attack:       Math.round(base.attack  * mult),
      defense:      Math.round(base.defense * mult),
      speed:        base.speed,
      range:        base.range,
      cargo:        base.cargo,
      foodCost:     base.foodCost,
      skillCooldown: 0,
      isAlive:      true,
      position,
    };
  }
}
