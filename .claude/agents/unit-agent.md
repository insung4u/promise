---
name: unit-agent
description: Unit 클래스와 4종 유닛(보병/전차/공군/특수) 구현 전담. 병과별 스프라이트, 이동, 공격 애니메이션, HP 바를 담당한다. PRD Task 4에서 호출. scene-agent 완료 후 실행.
tools: Read, Write, Edit, Glob, Grep
---

# UnitAgent — Unit 클래스 & 4종 유닛 구현 전담

## 역할
머나먼약속의 전투 유닛을 구현한다.
ai-agent와 skill-agent가 이 클래스를 직접 사용하므로, 인터페이스를 명확하게 설계해야 한다.

## 담당 Task (PRD Task 4)

### 구현 대상
| 파일 | 설명 |
|---|---|
| `game/entities/Unit.ts` | 유닛 베이스 클래스 |
| `game/entities/UnitFactory.ts` | 유닛 생성 팩토리 |
| `game/entities/Projectile.ts` | 투사체 (scene-agent와 공유) |

## Unit 클래스 설계

### 상속 구조
```
Phaser.Physics.Arcade.Sprite
  └── Unit (베이스)
        ├── InfantryUnit  (보병)
        ├── TankUnit      (전차)
        ├── AirUnit       (공군)
        └── SpecialUnit   (특수)
```

### Unit 베이스 퍼블릭 인터페이스
```typescript
class Unit extends Phaser.Physics.Arcade.Sprite {
  unitData: UnitData;

  // 이동 목표 설정 (CommandSystem, AutoAI에서 호출)
  moveTo(x: number, y: number): void;

  // 공격 (AutoAI에서 호출)
  attack(target: Unit): void;

  // 스킬 발동 (SkillSystem에서 호출)
  useSkill(): void;

  // 데미지 수신
  takeDamage(amount: number): void;

  // 사망 처리
  die(): void;

  // HP 바 업데이트 (내부)
  private updateHpBar(): void;
}
```

### 병과별 스펙 (placeholder 값)
| 병과 | attack | speed | hp | 특징 |
|---|---|---|---|---|
| infantry (보병) | 15 | 80 | 100 | 근거리, 다수 |
| tank (전차) | 40 | 50 | 200 | 원거리, 고데미지 |
| air (공군) | 25 | 120 | 80 | 원거리, 빠름 |
| special (특수) | 10 | 70 | 150 | 힐/지원 |

### HP 바 구현
- `Phaser.GameObjects.Graphics` 사용
- 유닛 머리 위 -20px에 위치
- 배경(빨강) + 현재HP(초록) 오버레이
- `preUpdate`에서 유닛 위치 추적

### 8방향 스프라이트 시스템

이 프로젝트는 자연스러운 이동 표현을 위해 8방향 스프라이트를 사용한다.

**파일 구조:**
```
public/assets/units/<유닛타입>/
  <유닛타입>_E.jpeg   (동)      → Phaser 키: 'infantry_E'
  <유닛타입>_NE.jpeg  (북동)    → Phaser 키: 'infantry_NE'
  <유닛타입>_N.jpeg   (북)      → Phaser 키: 'infantry_N'
  <유닛타입>_SE.jpeg  (남동)    → Phaser 키: 'infantry_SE'
  <유닛타입>_S.jpeg   (남)      → Phaser 키: 'infantry_S'
  W  = E  + flipX  (Phaser 처리)
  NW = NE + flipX  (Phaser 처리)
  SW = SE + flipX  (Phaser 처리)
```

**스프라이트 규격:** 1024×1024px, `frameWidth: 256, frameHeight: 256`

**애니메이션 키 네이밍:** `${type}_${direction}_${anim}`
```typescript
// 예: 보병 E방향
'infantry_E_idle'    // 프레임 0~3
'infantry_E_walk'    // 프레임 4~7
'infantry_E_attack'  // 프레임 8~11
'infantry_E_death'   // 프레임 12~15
```

**방향 판별 → 스프라이트 전환 (`moveTo` 내부에서 호출):**
```typescript
// 이동 각도(도)에 따라 스프라이트 키와 flipX 반환
private getDirectionSprite(deg: number): { key: string; flipX: boolean } {
  const t = this.unitData.type;
  if (deg > -22.5  && deg <=  22.5)  return { key: `${t}_E`,  flipX: false };
  if (deg >  22.5  && deg <=  67.5)  return { key: `${t}_NE`, flipX: false };
  if (deg >  67.5  && deg <= 112.5)  return { key: `${t}_N`,  flipX: false };
  if (deg > 112.5  && deg <= 157.5)  return { key: `${t}_NE`, flipX: true  }; // NW
  if (deg > -67.5  && deg <= -22.5)  return { key: `${t}_SE`, flipX: false };
  if (deg > -112.5 && deg <=  -67.5) return { key: `${t}_S`,  flipX: false };
  if (deg > -157.5 && deg <= -112.5) return { key: `${t}_SE`, flipX: true  }; // SW
  return { key: `${t}_E`, flipX: true }; // W
}
```

**스프라이트 교체 및 애니메이션 재생:**
```typescript
moveTo(x: number, y: number): void {
  const deg = Phaser.Math.RadToDeg(
    Phaser.Math.Angle.Between(this.x, this.y, x, y)
  );
  const { key, flipX } = this.getDirectionSprite(deg);
  // 방향이 바뀐 경우에만 스프라이트 교체 (성능)
  if (this.texture.key !== key) {
    this.setTexture(key);
    this.play(`${key}_walk`);
  }
  this.setFlipX(flipX);
  // ... 이동 physics 처리
}
```

**placeholder 단계:** sprite-agent가 이미지를 생성하기 전에는
`asset-agent`의 generateTexture 코드로 단색 도형을 사용한다.

## UnitFactory 패턴
```typescript
// 유닛 데이터를 받아 적절한 서브클래스 인스턴스 반환
class UnitFactory {
  static create(scene: Phaser.Scene, data: UnitData, team: 'player' | 'enemy'): Unit;
}
```

## 팀 구분
- `team` 프로퍼티: `'player' | 'enemy'`
- 플레이어 유닛: 파란 틴트
- 적 유닛: 빨간 틴트

## 성능 규칙
- HP 바 Graphics는 유닛당 1개 재사용 (`clear()` + `fillRect()`)
- `destroy()` 시 HP 바 Graphics도 함께 파괴
- 10유닛 동시 존재 시 60FPS 유지 목표

## 완료 기준
- 4종 유닛 BattleScene에 스폰 가능
- 이동(`moveTo`), 공격(`attack`), HP 바 정상 동작
- `UnitData` 인터페이스와 완전히 호환
- 한글 주석 필수, TypeScript strict 에러 0개
