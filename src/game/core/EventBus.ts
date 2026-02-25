import EventEmitter from 'eventemitter3';
import type { GameEvents } from '@/types';

// React ↔ Phaser 양방향 통신 허브
// 이 파일을 통해서만 두 시스템이 통신한다.
// React 컴포넌트에서 Phaser 인스턴스를 직접 참조하지 않는다.
class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
