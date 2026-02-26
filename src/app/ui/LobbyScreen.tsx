import { useState, useCallback } from 'react';
import { usePlayerStore } from '@/app/store/playerStore';
import { Separator } from '@/components/ui/separator';
import TopBar from './components/TopBar';
import UnitCard from './components/UnitCard';
import DeckSlot from './components/DeckSlot';
import BattleStartButton from './components/BattleStartButton';
import type { UnitData } from '@/types';

/**
 * 로비 화면 — 덱 편성 메인 UI
 *
 * 레이아웃:
 *   - 상단 HUD 오버레이 (자원/명성/계급)
 *   - 중앙 스크롤 영역 (24유닛 그리드)
 *   - 하단 고정 패널 (덱 슬롯 5개 + 전투 시작 버튼)
 *
 * HTML5 Drag API 사용. react-dnd 미사용.
 */
export default function LobbyScreen() {
  const { player, setDeck } = usePlayerStore();

  /** 현재 드래그 중인 유닛 */
  const [draggingUnit, setDraggingUnit] = useState<UnitData | null>(null);

  /**
   * 유닛 카드에서 덱 슬롯으로 드롭 처리
   * - 이미 덱에 있는 유닛은 중복 추가 방지
   * - 덱이 5개 미만인 슬롯에만 추가
   */
  const handleDrop = useCallback(
    (unitId: string, slotIndex: number) => {
      const unit = player.allUnits.find((u) => u.id === unitId);
      if (!unit) return;

      // 이미 덱에 있으면 중복 추가 방지
      if (player.deck.some((u) => u.id === unitId)) return;

      // 새 덱 배열 생성 (슬롯 인덱스에 삽입)
      const newDeck = [...player.deck];
      if (slotIndex < newDeck.length) {
        // 해당 슬롯에 유닛이 이미 있으면 교체
        newDeck[slotIndex] = unit;
      } else {
        // 슬롯이 비어있으면 배열에 추가
        newDeck.push(unit);
      }

      // 최대 5개 제한
      setDeck(newDeck.slice(0, 5));
      setDraggingUnit(null);
    },
    [player.allUnits, player.deck, setDeck]
  );

  /**
   * 덱에서 유닛 제거 (슬롯 더블클릭)
   */
  const handleRemove = useCallback(
    (slotIndex: number) => {
      const newDeck = player.deck.filter((_, i) => i !== slotIndex);
      setDeck(newDeck);
    },
    [player.deck, setDeck]
  );

  /** 덱에 포함된 유닛 id 집합 */
  const deckIds = new Set(player.deck.map((u) => u.id));

  return (
    <div className="flex flex-col h-full w-full">
      {/* ─── 상단 HUD 오버레이 ─────────────────────────────────────────── */}
      <TopBar
        resources={player.resources}
        fame={player.fame}
        rank={player.rank}
      />

      {/* ─── 중앙: 유닛 그리드 (스크롤 가능) ────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-950/60 px-3 py-2">
        <div className="text-xs text-gray-500 mb-2 font-medium">
          보유 유닛 ({player.allUnits.length}개)
          <span className="ml-2 text-gray-600">— 카드를 드래그해서 덱에 추가하세요</span>
        </div>

        {/* 4열 그리드 (24유닛) */}
        <div className="grid grid-cols-4 gap-2 pb-2">
          {player.allUnits.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              isDragging={draggingUnit?.id === unit.id}
              isInDeck={deckIds.has(unit.id)}
              onDragStart={setDraggingUnit}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-gray-700/50" />

      {/* ─── 하단 고정 패널 (덱 편성 + 전투 시작) ────────────────────────── */}
      <div
        className="shrink-0 bg-gray-900/95 backdrop-blur-sm px-3 pt-3 pb-safe"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {/* 덱 슬롯 5개 */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-2 font-medium">
            덱 편성 ({player.deck.length}/5)
          </div>
          <div className="flex gap-2 justify-center">
            {/* 5슬롯 배열 (null로 빈 슬롯 표시) */}
            {Array.from({ length: 5 }, (_, i) => (
              <DeckSlot
                key={i}
                index={i}
                unit={player.deck[i] ?? null}
                onDrop={handleDrop}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>

        <Separator className="bg-gray-700/50 mb-3" />

        {/* 전투 시작 버튼 */}
        <BattleStartButton />
      </div>
    </div>
  );
}
