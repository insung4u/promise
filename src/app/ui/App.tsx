import PhaserGame from './PhaserGame';

// 앱 루트 컴포넌트
// Task 2(ui-agent)에서 로비 화면, 덱 편성 등 UI가 추가될 때 상/하단 공간을 활용합니다.
export default function App() {
  return (
    <div className="flex items-center justify-center w-full h-[100dvh] bg-black">
      {/* 가변적으로 화면을 채우는 메인 컨테이너 (iPhone 15 Pro 등 지원) */}
      <div className="relative w-full h-full max-w-[430px] mx-auto bg-gray-900 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">

        {/* 상단 UI 예약 공간 (HUD, 자원, 상태 정보) */}
        <div className="h-[120px] shrink-0 bg-gray-800 flex items-center justify-center border-b border-gray-700/50">
          <span className="text-gray-400 text-sm font-medium">상단 UI 요소 (HUD, 상태)</span>
        </div>

        {/* 중앙 게임 맵 영역 (Phaser) - 남은 공간을 채우고 그 안에서 390x480이 Center됨 */}
        {/* 중요: min-h-0 을 주어 모바일 브라우저 주소창 등으로 높이가 줄어들 때 flex item이 쪼그라들 수 있게 합니다. */}
        <div className="flex-1 w-full bg-[#1a1a2e] flex items-center justify-center relative min-h-0">
          <PhaserGame />
        </div>

        {/* 하단 UI 예약 공간 (덱 편성, 스킬 버튼, 조작 버튼) */}
        <div className="h-[244px] shrink-0 bg-gray-800 flex items-center justify-center border-t border-gray-700/50">
          <span className="text-gray-400 text-sm font-medium">하단 UI 요소 (스킬, 덱 편성)</span>
        </div>

      </div>
    </div>
  );
}
