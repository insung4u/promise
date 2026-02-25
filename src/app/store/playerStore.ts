import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlayerData, UnitData, UnitType } from '@/types';

interface PlayerStore {
  player: PlayerData;
  setDeck: (deck: UnitData[]) => void;
  addFame: (amount: number) => void;
  addResources: (amount: number) => void;
}

// 기본 유닛 데이터 생성 헬퍼
function makeUnit(id: string, type: UnitType): UnitData {
  const stats: Record<UnitType, Pick<UnitData, 'hp' | 'maxHp' | 'attack' | 'defense' | 'speed' | 'range' | 'cargo' | 'foodCost'>> = {
    infantry: { hp: 100, maxHp: 100, attack: 10, defense: 5,  speed: 80,  range: 1, cargo: 8, foodCost: 0.21 },
    tank:     { hp: 200, maxHp: 200, attack: 20, defense: 15, speed: 50,  range: 3, cargo: 4, foodCost: 0.42 },
    air:      { hp: 80,  maxHp: 80,  attack: 15, defense: 2,  speed: 120, range: 5, cargo: 2, foodCost: 0.35 },
    special:  { hp: 150, maxHp: 150, attack: 25, defense: 10, speed: 60,  range: 8, cargo: 6, foodCost: 0.50 },
  };

  return {
    id,
    type,
    tier: 1,
    ...stats[type],
    position: { x: 0, y: 0 },
    skillCooldown: 0,
    isAlive: true,
  };
}

// 기본 덱 — 보병 5유닛
const defaultUnits: UnitData[] = [
  makeUnit('unit-0', 'infantry'),
  makeUnit('unit-1', 'infantry'),
  makeUnit('unit-2', 'tank'),
  makeUnit('unit-3', 'air'),
  makeUnit('unit-4', 'special'),
];

// 플레이어 전역 상태 슬라이스
// persist 미들웨어로 localStorage에 자동 저장 — 앱 재시작 후에도 자원/명성 유지
export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      player: {
        resources: 1000,
        fame: 0,
        rank: 'soldier',
        allUnits: defaultUnits,
        deck: defaultUnits.slice(0, 5),
      },
      setDeck: (deck) => set((s) => ({ player: { ...s.player, deck } })),
      addFame: (amount) => set((s) => ({
        player: { ...s.player, fame: s.player.fame + amount },
      })),
      addResources: (amount) => set((s) => ({
        player: { ...s.player, resources: s.player.resources + amount },
      })),
    }),
    {
      name: 'promise-player',           // localStorage 키
      partialize: (s) => ({             // 함수 제외, 직렬화 가능 필드만 저장
        player: {
          resources: s.player.resources,
          fame:      s.player.fame,
          rank:      s.player.rank,
          allUnits:  s.player.allUnits,
          deck:      s.player.deck,
        },
      }),
    }
  )
);
