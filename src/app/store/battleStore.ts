import { create } from 'zustand';
import type { BattleResult, BattleMode } from '@/types';

interface BattleStore {
  isInBattle: boolean;
  mode: BattleMode;
  timeLimit: number;
  lastResult: BattleResult | null;
  startBattle: (mode: BattleMode, timeLimit?: number) => void;
  endBattle: (result: BattleResult) => void;
}

// 전투 상태 슬라이스 — 전투 진행 중 상태와 결과를 관리
// persist 없음 (세션 내 일시 상태)
export const useBattleStore = create<BattleStore>((set) => ({
  isInBattle: false,
  mode: 'attack',
  timeLimit: 600,    // 기본 10분
  lastResult: null,
  startBattle: (mode, timeLimit = 600) =>
    set({ isInBattle: true, mode, timeLimit }),
  endBattle: (result) =>
    set({ isInBattle: false, lastResult: result }),
}));
