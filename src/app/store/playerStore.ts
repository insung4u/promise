import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlayerData, UnitData, UnitType } from '@/types';
import { UnitFactory } from '@/game/entities/UnitFactory';

interface PlayerStore {
  player: PlayerData;
  setDeck: (deck: UnitData[]) => void;
  addFame: (amount: number) => void;
  addResources: (amount: number) => void;
}

/**
 * 기본 유닛 데이터 생성 헬퍼
 * 스탯 테이블은 UnitFactory.getDefaultData()에서만 관리한다.
 */
function makeUnit(id: string, type: UnitType, tier: number = 1): UnitData {
  const base = UnitFactory.getDefaultData(type, id);
  return { ...base, tier };
}

/**
 * 24개 기본 유닛 생성
 * 4종 유닛 × 6티어 = 24개
 * 순서: 보병 T1~T6, 전차 T1~T6, 공군 T1~T6, 특수 T1~T6
 */
const UNIT_TYPES: UnitType[] = ['infantry', 'tank', 'air', 'special'];
const ALL_UNITS: UnitData[] = UNIT_TYPES.flatMap((type, typeIdx) =>
  [1, 2, 3, 4, 5, 6].map((tier) => {
    const id = `unit-${typeIdx * 6 + (tier - 1)}`;
    const base = makeUnit(id, type, tier);
    // 티어에 따라 스탯 배율 적용 (티어 × 1.2^(tier-1))
    const mult = Math.pow(1.2, tier - 1);
    return {
      ...base,
      hp:      Math.round(base.hp      * mult),
      maxHp:   Math.round(base.maxHp   * mult),
      attack:  Math.round(base.attack  * mult),
      defense: Math.round(base.defense * mult),
    };
  })
);

/**
 * 플레이어 전역 상태 슬라이스
 * persist 미들웨어로 localStorage에 자동 저장 — 앱 재시작 후에도 자원/명성 유지
 */
export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      player: {
        resources: 1000,
        fame: 0,
        rank: 'soldier',
        allUnits: ALL_UNITS,
        // 기본 덱: 보병 T1, 전차 T1, 공군 T1, 특수 T1, 보병 T2
        deck: [ALL_UNITS[0], ALL_UNITS[6], ALL_UNITS[12], ALL_UNITS[18], ALL_UNITS[1]],
      },
      setDeck: (deck) => set((s) => ({ player: { ...s.player, deck } })),
      addFame: (amount) =>
        set((s) => ({ player: { ...s.player, fame: s.player.fame + amount } })),
      addResources: (amount) =>
        set((s) => ({
          player: { ...s.player, resources: s.player.resources + amount },
        })),
    }),
    {
      name: 'promise-player',
      // 함수 제외, 직렬화 가능 필드만 저장
      partialize: (s) => ({
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
