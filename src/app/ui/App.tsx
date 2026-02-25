import PhaserGame from './PhaserGame';

// 앱 루트 컴포넌트
// Task 2(ui-agent)에서 로비 화면, 덱 편성 등 UI가 추가된다.
export default function App() {
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-gray-950">
      {/* Phaser 캔버스 컨테이너 — 세로형 390×844 (iPhone 14 논리 해상도) */}
      <div className="relative w-[390px] h-[844px] max-w-full max-h-full">
        <PhaserGame />
      </div>
    </div>
  );
}
