import { cn } from '@/lib/utils';
import type { UnitData } from '@/types';

interface DeckSlotProps {
  index: number;        // 0~4
  unit: UnitData | null;
  onDrop: (unitId: string, slotIndex: number) => void;
  onRemove: (slotIndex: number) => void;
}

/**
 * 유닛 타입별 슬롯 색상 (채워진 상태)
 */
const SLOT_FILL_COLOR: Record<UnitData['type'], string> = {
  infantry: 'bg-green-700 border-green-400',
  tank:     'bg-gray-600  border-gray-400',
  air:      'bg-blue-700  border-blue-400',
  special:  'bg-purple-700 border-purple-400',
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
 * 덱 슬롯 — 드롭 타깃
 * 유닛이 없으면 빈 슬롯, 있으면 유닛 정보 표시.
 * 더블클릭/더블탭으로 유닛 제거.
 */
export default function DeckSlot({ index, unit, onDrop, onRemove }: DeckSlotProps) {
  /** 드래그 오버 시 드롭 허용 표시 */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  /** 드롭 이벤트 처리 */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const unitId = e.dataTransfer.getData('text/plain');
    if (unitId) {
      onDrop(unitId, index);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDoubleClick={() => unit && onRemove(index)}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'w-14 h-16 rounded-lg border-2 transition-all duration-150',
        'select-none',
        unit
          ? SLOT_FILL_COLOR[unit.type]
          : 'border-dashed border-gray-500 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-400'
      )}
      title={unit ? '더블클릭으로 제거' : `슬롯 ${index + 1}`}
    >
      {/* 슬롯 번호 (우상단) */}
      <span className="absolute top-0.5 right-1 text-[9px] text-white/50 font-mono">
        {index + 1}
      </span>

      {unit ? (
        <>
          {/* 유닛 아이콘 */}
          <div className="text-xl mb-0.5">{UNIT_ICON[unit.type]}</div>
          {/* 티어 */}
          <div className="text-[9px] text-yellow-300 font-bold">T{unit.tier}</div>
          {/* 제거 힌트 */}
          <div className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] text-white/40">
            2x제거
          </div>
        </>
      ) : (
        /* 빈 슬롯 — 드롭 유도 텍스트 */
        <span className="text-gray-500 text-[10px] text-center leading-tight px-1">
          여기에<br />드롭
        </span>
      )}
    </div>
  );
}
