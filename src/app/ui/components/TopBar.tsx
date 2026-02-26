import type { PlayerData } from '@/types';

interface TopBarProps {
  resources: number;
  fame: number;
  rank: PlayerData['rank'];
}

/**
 * 계급별 아이콘 매핑
 */
const RANK_ICON: Record<PlayerData['rank'], string> = {
  soldier: '⚔️',
  general: '🎖️',
  marquis: '👑',
  duke:    '🏰',
};

/**
 * 계급별 한글 이름 매핑
 */
const RANK_LABEL: Record<PlayerData['rank'], string> = {
  soldier: '병사',
  general: '장군',
  marquis: '후작',
  duke:    '공작',
};

/**
 * 상단 바 — 자원, 명성, 계급 아이콘 표시
 * usePlayerStore에서 읽기 전용으로 props를 받는다.
 */
export default function TopBar({ resources, fame, rank }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700/60">
      {/* 자원 표시 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">🪙</span>
        <span className="text-yellow-300 font-bold text-sm">
          {resources.toLocaleString()}
        </span>
      </div>

      {/* 명성 표시 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">⭐</span>
        <span className="text-amber-300 font-bold text-sm">
          {fame.toLocaleString()}
        </span>
      </div>

      {/* 계급 표시 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{RANK_ICON[rank]}</span>
        <span className="text-gray-200 text-xs font-medium">
          {RANK_LABEL[rank]}
        </span>
      </div>
    </div>
  );
}
