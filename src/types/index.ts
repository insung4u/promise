// ============================================================
// 머나먼약속 — 전체 타입 정의 파일
// 모든 인터페이스는 이 파일에서만 정의한다. 인라인 타입 금지.
// ============================================================

// 유닛 데이터
export interface UnitData {
  id: string;
  type: 'infantry' | 'tank' | 'air' | 'special';
  tier: number;           // 1~6
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;          // 사정거리 (타일 수): 1=근접, 3~5=단거리, 8~10=장거리
  cargo: number;          // 적재량 (Phase 1+ 자원 채집용)
  foodCost: number;       // 식량소모/시간 (Phase 1+ 유지비용)
  position: { x: number; y: number };
  target?: { x: number; y: number };
  skillCooldown: number;
  isAlive: boolean;
}

// 플레이어 데이터
export interface PlayerData {
  resources: number;
  fame: number;
  rank: 'soldier' | 'general' | 'marquis' | 'duke';
  allUnits: UnitData[];   // 최대 24개
  deck: UnitData[];       // 정확히 5개
}

// 거점 데이터
export interface CapturePoint {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
  captureProgress: number; // 0~100 점령 진행률
}

// 전투 결과
export interface BattleResult {
  result: 'win' | 'lose';
  mode: 'attack' | 'defense';
  survivalCount: number;
  timeElapsed: number;    // 초 단위
  resourceReward: number;
  fameReward: number;
}

// EventBus 이벤트 타입 맵
// React → Phaser 방향과 Phaser → React 방향 모두 포함
export interface GameEvents {
  // React → Phaser
  'battle:start':      { deck: UnitData[]; mode: 'attack' | 'defense'; timeLimit: number };
  'battle:skill':      { unitId: string; skillIndex: number };
  'battle:swipe':      { direction: 'up' | 'down' | 'left' | 'right' | 'center' };
  'battle:autoToggle': { auto: boolean };
  // Phaser → React
  'battle:result':     BattleResult;
  'battle:hud':        {
    timeLeft: number;
    playerCount: number;
    enemyCount: number;
    /** 스킬별 쿨타임 비율 (0.0 = 사용 가능, 1.0 = 방금 사용) — 인덱스 0~3 */
    skillCooldownRatios: [number, number, number, number];
  };
  'scene:ready':       { sceneName: string };
}

// 스킬 타입
export type SkillType = 'charge' | 'barrage' | 'airstrike' | 'heal';

export interface SkillData {
  type: SkillType;
  unitType: 'infantry' | 'tank' | 'air' | 'special';
  cooldown: number;   // 초
  duration: number;   // 초
}

// 명령 방향 타입
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'center';

// 거점 소유자 타입
export type OwnerType = 'player' | 'enemy' | 'neutral';

// 유닛 타입
export type UnitType = 'infantry' | 'tank' | 'air' | 'special';

// 전투 모드
export type BattleMode = 'attack' | 'defense';

// 유닛 애니메이션 방향 키
// 스프라이트 텍스처 키 형식: ${UnitType}_${DirectionKey}
export type DirectionKey = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
