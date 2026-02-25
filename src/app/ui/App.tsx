import PhaserGame from './PhaserGame';

// 앱 루트 컴포넌트
// Task 2(ui-agent)에서 로비 화면, 덱 편성 등 UI가 추가될 때 상/하단 공간을 활용합니다.
export default function App() {
  return (
    // fixed inset-0 (position: fixed; top, bottom, left, right: 0) 을 사용하면 모바일 Safari(주소창 등) 환경에서도 물리적인 화면 상에 정확히 컨테이너가 꽉 맞춰집니다.
    <div className="fixed inset-0 flex items-center justify-center w-full bg-black">
      {/* 가변적으로 화면을 채우는 메인 컨테이너 (iPhone 15 Pro 등 지원) - 오버레이 기준점 */}
      <div className="relative w-full h-full max-w-[430px] mx-auto overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]">

        {/* 배경: 중앙 게임 맵 영역 (Phaser) - 전체 화면 100% 채움 (z-0) */}
        <div className="absolute inset-0 z-0 bg-[#1a1a2e]">
          <PhaserGame />
        </div>

        {/* 포그라운드 UI 오버레이 컨테이너 (z-10) - 클릭 스루 설정 허용 고민(pointer-events) */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

          {/* 상단 UI (HUD, 상태) - floating overlay */}
          <div className="h-[120px] shrink-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center border-b border-gray-700/50 pointer-events-auto">
            <span className="text-gray-300 text-sm font-medium">상단 HUD 오버레이</span>
          </div>

          {/* 중앙 남는 공간: 게임 화면이 보이는 투명한 영역 */}
          <div className="flex-1 w-full min-h-0" />

          {/* 하단 UI (덱 편성, 조작) - floating overlay: Clash Royale 비율에 맞춰 크기 축소 (180px) */}
          <div className="h-[180px] shrink-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center border-t border-gray-700/50 pointer-events-auto">
            <span className="text-gray-300 text-sm font-medium">하단 덱/스킬 조작부 오버레이 (180px)</span>
          </div>

        </div>

      </div>
    </div>
  );
}
