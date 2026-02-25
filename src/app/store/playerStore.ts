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

// 기본 유닛 데이터 생성 헬퍼 — 단일 진실 소스(UnitFactory)에 위임
// 스탯 테이블은 UnitFactory.getDefaultData()에서만 관리
function makeUnit(id: string, type: UnitType): UnitData {
  return UnitFactory.getDefaultData(type, id);
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
