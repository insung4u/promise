import Phaser from 'phaser';
import type { UnitData, UnitType } from '@/types';
import { Unit } from './Unit';

// 유닛 팩토리 — 유닛 타입에 따라 적절한 인스턴스를 생성한다.
// Task 4(unit-agent)에서 4종 유닛 클래스로 분기된다.
export class UnitFactory {
  // 유닛 타입별 기본 스탯 반환
  static getDefaultData(type: UnitType, id: string): UnitData {
    const defaults: Record<UnitType, Omit<UnitData, 'id' | 'type' | 'position'>> = {
      infantry: {
        tier: 1, hp: 100, maxHp: 100,
        attack: 10, defense: 5, speed: 80,
        range: 1, cargo: 8, foodCost: 0.21,
        skillCooldown: 0, isAlive: true,
      },
      tank: {
        tier: 1, hp: 200, maxHp: 200,
        attack: 20, defense: 15, speed: 50,
        range: 3, cargo: 4, foodCost: 0.42,
        skillCooldown: 0, isAlive: true,
      },
      air: {
        tier: 1, hp: 80, maxHp: 80,
        attack: 15, defense: 2, speed: 120,
        range: 5, cargo: 2, foodCost: 0.35,
        skillCooldown: 0, isAlive: true,
      },
      special: {
        tier: 1, hp: 150, maxHp: 150,
        attack: 25, defense: 10, speed: 60,
        range: 8, cargo: 6, foodCost: 0.50,
        skillCooldown: 0, isAlive: true,
      },
    };

    return {
      id,
      type,
      position: { x: 0, y: 0 },
      ...defaults[type],
    };
  }

  // 씬에 유닛 인스턴스 생성
  static create(scene: Phaser.Scene, x: number, y: number, unitData: UnitData): Unit {
    const textureKey = `${unitData.type}_E`;
    return new Unit(scene, x, y, textureKey, unitData);
  }
}
