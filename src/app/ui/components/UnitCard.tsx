import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UnitData } from '@/types';

interface UnitCardProps {
  unit: UnitData;
  /** 드래그 중 시각 피드백 */
  isDragging?: boolean;
  /** 덱에 이미 포함됐는지 (중복 표시용) */
  isInDeck?: boolean;
  onDragStart: (unit: UnitData) => void;
}

/**
 * 유닛 타입별 배경 색상
 */
const UNIT_COLOR: Record<UnitData['type'], string> = {
  infantry: 'bg-green-700 border-green-500',
  tank:     'bg-gray-600  border-gray-400',
  air:      'bg-blue-700  border-blue-500',
  special:  'bg-purple-700 border-purple-500',
};

/**
 * 유닛 타입별 아이콘
 */
const UNIT_ICON: Record<UnitData['type'], string> = {
  infantry: '⚔️',
  tank:     '🛡️',
  air:      '✈️',
  special:  '💫',
};

/**
 * 유닛 타입별 한글 이름
 */
const UNIT_TYPE_LABEL: Record<UnitData['type'], string> = {
  infantry: '보병',
  tank:     '전차',
  air:      '공군',
  special:  '특수',
};

/**
 * 개별 유닛 카드 — 드래그 소스 역할
 * HTML5 Drag API를 사용한다. react-dnd 미사용.
 */
export default function UnitCard({
  unit,
  isDragging = false,
  isInDeck = false,
  onDragStart,
}: UnitCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // 드래그 데이터에 유닛 id를 저장 (DeckSlot에서 수신)
        e.dataTransfer.setData('text/plain', unit.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(unit);
      }}
      className={cn(
        'relative flex flex-col items-center justify-between',
        'rounded-lg border-2 p-2 cursor-grab active:cursor-grabbing',
        'select-none transition-all duration-150',
        UNIT_COLOR[unit.type],
        isDragging && 'opacity-50 scale-95',
        isInDeck && 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-900'
      )}
    >
      {/* 티어 뱃지 (우상단) */}
      <Badge
        className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-yellow-500 text-black border-0"
      >
        T{unit.tier}
      </Badge>

      {/* 유닛 아이콘 */}
      <div className="text-2xl mb-0.5">{UNIT_ICON[unit.type]}</div>

      {/* 유닛 타입 이름 */}
      <div className="text-white text-[10px] font-bold leading-none mb-1">
        {UNIT_TYPE_LABEL[unit.type]}
      </div>

      {/* 스탯 표시 (공격/방어/체력) */}
      <div className="flex flex-col gap-0.5 w-full">
        <div className="flex justify-between text-[9px] text-white/80">
          <span>공</span><span className="text-red-300 font-bold">{unit.attack}</span>
        </div>
        <div className="flex justify-between text-[9px] text-white/80">
          <span>방</span><span className="text-blue-300 font-bold">{unit.defense}</span>
        </div>
        <div className="flex justify-between text-[9px] text-white/80">
          <span>HP</span><span className="text-green-300 font-bold">{unit.maxHp}</span>
        </div>
      </div>

      {/* 덱 포함 표시 오버레이 */}
      {isInDeck && (
        <div className="absolute inset-0 rounded-lg bg-black/30 flex items-center justify-center">
          <span className="text-yellow-400 text-xs font-bold">덱</span>
        </div>
      )}
    </div>
  );
}
