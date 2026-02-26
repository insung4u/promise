import { create } from 'zustand';
import type { BattleResult, BattleMode } from '@/types';

interface BattleStore {
  isInBattle: boolean;
  mode: BattleMode;
  timeLimit: number;
  lastResult: BattleResult | null;
  startBattle: (mode: BattleMode, timeLimit?: number) => void;
  endBattle: (result: BattleResult) => void;
  /** 결과 화면 → 로비 복귀: lastResult를 null로 초기화 */
  returnToLobby: () => void;
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
  returnToLobby: () =>
    set({ isInBattle: false, lastResult: null }),
}));
