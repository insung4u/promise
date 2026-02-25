# 고품질 게임 에셋 및 스프라이트 생성 가이드 (Google AI Pro 환경)

이 문서는 임시(Placeholder) 느낌의 대충 만든 이미지를 벗어나, **선명하고 전문적인 고품질 스프라이트 시트**를 제작하기 위한 워크플로우를 기록합니다. 사용자는 Google AI Pro(Gemini Advanced) 환경을 중심으로, Nano Banana와 같은 외부 AI/MCP를 활용하여 최고의 결과물을 얻도록 설계되었습니다.

## 1. Google AI Pro (Gemini Advanced) 활용 워크플로우

Gemini Advanced는 복잡한 맥락을 이해하고 매우 구체적인 프롬프트를 작성하는 데 강력합니다. 직접 이미지를 생성하기 전, **"최고의 프롬프트와 컨셉 아트"를 뽑아내는 기획자/아트 디렉터** 역할로 적극 활용해야 합니다.

1. **컨셉 도출 및 세부 설정:** Gemini Advanced에게 원하는 유닛의 배경, 재질, 조명, 애니메이션 종류를 설명하게 하여 시각적 세부 묘사를 텍스트로 완성합니다.
2. **에셋 프롬프트 최적화:** AI 이미지 제너레이터(Nano Banana, Scenario 등)가 가장 잘 이해하는 영문 프롬프트 형식으로 변환을 요청합니다.
3. **스프라이트 시트 구조 설계:** 걷기(Walk), 공격(Attack), 대기(Idle) 등 필요한 프레임 수와 배열(예: 4x4 그리드)을 AI와 미리 규정합니다.

## 2. 스프라이트 시트 그리드 셀 명세 (일관성 확보 필수)

> **경고:** 4x4 그리드 스프라이트 시트를 생성할 때 각 칸(Row, Col)의 방향과 동작을 프롬프트에 명시하지 않으면, 생성할 때마다 결과가 달라져 게임 코드가 기대하는 프레임 배치와 일치하지 않게 됩니다. 반드시 아래 규칙에 따라 16개 셀을 모두 지정하십시오.

### 표준 4x4 스프라이트 시트 레이아웃

이 프로젝트는 아래 레이아웃을 표준으로 사용합니다. Phaser 3의 `anims.create`에서 프레임 인덱스(0~15)로 참조됩니다.

| | Col 1 (좌측 이동/첫 프레임) | Col 2 (두 번째 프레임) | Col 3 (세 번째 프레임) | Col 4 (우측 이동/마지막 프레임) |
|---|---|---|---|---|
| **Row 1 — 대기(Idle)** | 정면, 프레임 1 | 정면, 프레임 2 | 정면, 프레임 3 | 정면, 프레임 4 |
| **Row 2 — 이동(Walk)** | 이동, 프레임 1 | 이동, 프레임 2 | 이동, 프레임 3 | 이동, 프레임 4 |
| **Row 3 — 공격(Attack)** | 공격, 프레임 1 | 공격, 프레임 2 | 공격, 프레임 3 | 공격, 프레임 4 |
| **Row 4 — 사망(Death)** | 사망, 프레임 1 | 사망, 프레임 2 | 사망, 프레임 3 | 사망, 프레임 4 |

- 인덱스 계산: `(row - 1) * 4 + (col - 1)` → Row 1 Col 1 = 0, Row 4 Col 4 = 15
- 캐릭터는 모두 **오른쪽을 바라보는 방향**을 기준으로 생성 (코드에서 `flipX`로 반전하여 좌향 처리)

### 프롬프트 셀 명세 템플릿

스프라이트 시트 생성 프롬프트에는 반드시 아래 블록을 포함해야 합니다. `[유닛 설명]` 부분만 교체하여 사용하십시오.

```
STRICT SPRITE SHEET LAYOUT — 4 columns × 4 rows, exactly 16 cells total, read left-to-right then top-to-bottom:

Row 1 (Idle animation, facing right):
  Cell (1,1): idle stance, frame 1 — standing upright, relaxed pose
  Cell (1,2): idle stance, frame 2 — slight breathing motion, weight shift
  Cell (1,3): idle stance, frame 3 — returning to upright
  Cell (1,4): idle stance, frame 4 — back to neutral, loop ready

Row 2 (Walk animation, moving right):
  Cell (2,1): walk cycle, frame 1 — left foot forward, right arm forward
  Cell (2,2): walk cycle, frame 2 — mid-stride, both feet near ground
  Cell (2,3): walk cycle, frame 3 — right foot forward, left arm forward
  Cell (2,4): walk cycle, frame 4 — mid-stride return, loop ready

Row 3 (Attack animation, attacking toward right):
  Cell (3,1): attack, frame 1 — windup pose, weapon/limb drawn back
  Cell (3,2): attack, frame 2 — strike in motion, mid-swing or firing
  Cell (3,3): attack, frame 3 — impact point, fully extended
  Cell (3,4): attack, frame 4 — recovery, returning to idle ready

Row 4 (Death animation):
  Cell (4,1): death, frame 1 — hit reaction, staggering
  Cell (4,2): death, frame 2 — falling, body angled
  Cell (4,3): death, frame 3 — nearly on ground
  Cell (4,4): death, frame 4 — fully collapsed on ground, static

All 16 cells must contain exactly ONE frame of [유닛 설명] character.
Character always faces RIGHT. Consistent character design across all 16 cells.
Uniform cell size. Solid transparent/green background. No borders between cells.
```

### 실제 사용 예시 (보병 유닛)

```bash
node scripts/generate_sprite.mjs \
  "Pixel art sprite sheet of a medieval infantry soldier in light brown leather armor, holding a short sword. STRICT SPRITE SHEET LAYOUT — 4 columns x 4 rows, exactly 16 cells: Row 1 idle (4 frames, standing facing right, slight breathing motion), Row 2 walk (4 frames, walk cycle moving right), Row 3 attack (4 frames, sword slash toward right), Row 4 death (4 frames, collapsing to ground). Character always faces right. Consistent design across all 16 cells. Clean pixel art style, 16-bit SNES look, vibrant colors, solid green background, sharp focus, professional game asset. No text, no watermark, no borders between cells." \
  "units/infantry_spritesheet.jpeg"
```

### 일관성 체크리스트

생성 후 결과물을 반드시 아래 항목으로 검증한다.

- [ ] 정확히 4열 × 4행 = 16칸인가?
- [ ] Row 1 전체가 대기(Idle) 동작인가?
- [ ] Row 2 전체가 이동(Walk) 동작인가?
- [ ] Row 3 전체가 공격(Attack) 동작인가?
- [ ] Row 4 전체가 사망(Death) 동작인가?
- [ ] 모든 셀에서 캐릭터가 동일한 디자인(복장, 색상, 비율)을 유지하는가?
- [ ] 캐릭터가 일관되게 오른쪽을 바라보는가?
- [ ] 셀 간 경계선이 없고 배경이 단색(초록 또는 투명)인가?

검증 실패 시 프롬프트의 셀 명세를 더 구체적으로 작성한 후 재생성한다.

---

## 2-B. 개발자용 — 생성된 스프라이트 시트 사용법

> **목적:** 디자이너가 만든 4×4 스프라이트 시트 이미지를 Phaser 3 코드에서 정확히 잘라내어 애니메이션으로 재생하는 방법을 안내한다.

### 1. 이미지 좌표 구조 이해

Gemini Imagen API가 출력하는 이미지는 `1:1` 비율(정사각형)이다.
**4열 × 4행**으로 균등 분할된다고 가정하면 각 셀 크기는 다음과 같다.

| 이미지 전체 해상도 | 셀 1개 크기 (frameWidth × frameHeight) |
|---|---|
| 512 × 512 | **128 × 128** |
| 1024 × 1024 | **256 × 256** |

```
(0,0)──────(128,0)────(256,0)────(384,0)────(512,0)
  │  [0]Idle1 │ [1]Idle2 │ [2]Idle3 │ [3]Idle4 │
(0,128)──────────────────────────────────────(512,128)
  │  [4]Walk1 │ [5]Walk2 │ [6]Walk3 │ [7]Walk4 │
(0,256)──────────────────────────────────────(512,256)
  │ [8]Atk1  │ [9]Atk2  │[10]Atk3  │[11]Atk4  │
(0,384)──────────────────────────────────────(512,384)
  │[12]Die1  │[13]Die2  │[14]Die3  │[15]Die4  │
(0,512)──────────────────────────────────────(512,512)
```

**프레임 인덱스 = (row - 1) × 4 + (col - 1)**
예) Row 3, Col 2 → 공격 2번째 프레임 = 인덱스 **9**

### 2. Phaser 3 로드 코드

```typescript
// LoadingScene.ts 또는 BattleScene.preload()
// frameWidth / frameHeight 는 실제 이미지 해상도 ÷ 4 로 설정
this.load.spritesheet('infantry', 'assets/units/infantry_spritesheet.jpeg', {
  frameWidth: 128,   // 512px 이미지 기준
  frameHeight: 128,
});
```

### 3. 애니메이션 등록 코드

```typescript
// BattleScene.create() 또는 Unit.ts 초기화 시점
const ANIM_CONFIG = [
  { key: 'infantry_idle',   frames: [0, 1, 2, 3],     frameRate: 6,  repeat: -1 },
  { key: 'infantry_walk',   frames: [4, 5, 6, 7],     frameRate: 8,  repeat: -1 },
  { key: 'infantry_attack', frames: [8, 9, 10, 11],   frameRate: 10, repeat: 0  },
  { key: 'infantry_death',  frames: [12, 13, 14, 15], frameRate: 6,  repeat: 0  },
];

ANIM_CONFIG.forEach(({ key, frames, frameRate, repeat }) => {
  this.anims.create({
    key,
    frames: this.anims.generateFrameNumbers('infantry', { frames }),
    frameRate,
    repeat,
  });
});
```

### 4. 유닛에서 애니메이션 재생

```typescript
// Unit.ts — 상태 변화 시 애니메이션 전환
sprite.play('infantry_idle');   // 대기
sprite.play('infantry_walk');   // 이동
sprite.play('infantry_attack'); // 공격
sprite.play('infantry_death');  // 사망

// 왼쪽 방향 이동 시 — 이미지를 좌우 반전 (별도 스프라이트 불필요)
sprite.setFlipX(true);   // 왼쪽
sprite.setFlipX(false);  // 오른쪽 (기본)
```

### 5. 유닛 타입별 표준 키 네이밍 규칙

| 유닛 타입 | 스프라이트 키 | 파일 경로 |
|---|---|---|
| 보병 (infantry) | `infantry` | `assets/units/infantry_spritesheet.jpeg` |
| 전차 (tank) | `tank` | `assets/units/tank_spritesheet.jpeg` |
| 공군 (air) | `air` | `assets/units/air_spritesheet.jpeg` |
| 특수 (special) | `special` | `assets/units/special_spritesheet.jpeg` |

> **frameWidth 확인 방법:** 이미지 파일을 열고 실제 픽셀 너비를 확인한 뒤 `÷ 4` 를 계산한다.
> Gemini Imagen API 기본 출력이 1024px이면 `frameWidth: 256` 으로 설정해야 한다.

---

## 3. "대충 만든 이미지(Placeholder)"를 피하는 프롬프트 작성법

고품질의 인게임 리소스를 얻기 위해서는 프롬프트에 **스타일, 해상도 조건, 배경 처리, 조명, 용도** 등의 키워드가 반드시 들어가야 합니다.

**명품 프롬프트를 위한 필수 키워드 예시:**
* **스타일:** `Highly detailed pixel art`, `16-bit SNES style`, `isometric 2.5d render`, `clean linework`, `vibrant colors`
* **형태 및 뷰:** `full body`, `sprite sheet`, `walk cycle animation frames`, `top-down perspective`, `orthographic`
* **배경:** `solid green background` (크로마키용/배경 제거 용이) 또는 `transparent background`, `solid white background`
* **품질:** `game asset`, `masterpiece`, `sharp focus`, `professional video game art`, `anti-aliasing`
* **배제어(Negative Prompt):** `blurry`, `messy`, `inconsistent`, `text`, `watermark`, `3d realistic` (픽셀아트인 경우)

**가이드 프롬프트 예제:**
> "A highly detailed pixel art sprite sheet of a futuristic cyberpunk space marine, top-down isometric view. Features a walk cycle and shooting animation. Arranged in a 4x4 grid. Clean edges, vibrant neon blue and dark grey armor. Solid white background for easy transparency removal. Professional indie game asset, sharp focus."

## 3-B. 스프라이트 시트 생성 방법 비교 및 선택 가이드

이 프로젝트에서 사용 가능한 두 가지 방법을 상황에 맞게 선택한다.

### 방법 A — generate_spritesheet.mjs (자동화, 권장)

16개 프레임을 개별 생성 후 `sharp`로 4×4 그리드에 합성한다.
**그리드 레이아웃이 코드로 보장되므로 Phaser에서 정확한 frameWidth/frameHeight 사용 가능.**

```bash
# 유닛 타입: infantry / tank / air / special
node scripts/generate_spritesheet.mjs infantry units/infantry_spritesheet.jpeg
node scripts/generate_spritesheet.mjs tank     units/tank_spritesheet.jpeg
node scripts/generate_spritesheet.mjs air      units/air_spritesheet.jpeg
node scripts/generate_spritesheet.mjs special  units/special_spritesheet.jpeg
```

- 출력: `public/assets/units/*.jpeg` (1024×1024px, 셀당 256×256px)
- Phaser 설정: `frameWidth: 256, frameHeight: 256`
- 소요 시간: 약 2~3분 (API 16회 호출)
- 한계: 프레임마다 캐릭터 세부 디자인 미세 차이 가능

### 방법 B — Nano Banana (수동, 고일관성)

전문 스프라이트 시트 생성 툴로 캐릭터 일관성이 매우 높다.
API가 없어 수동 작업이 필요하지만, 게임 출시 품질의 에셋을 얻을 수 있다.

**워크플로:**
1. [nanobana.io](https://nanobana.io) 또는 동등한 스프라이트 시트 툴 접속
2. 아래 프롬프트 입력 (유닛 설명 부분만 교체):
   ```
   WW2 infantry soldier, green uniform, helmet, rifle, pixel art 16-bit style.
   4x4 sprite sheet, 16 frames total.
   Row 1: idle animation (4 frames).
   Row 2: walk cycle right (4 frames).
   Row 3: attack/shoot right (4 frames).
   Row 4: death animation (4 frames).
   Solid green background. No text. No borders.
   ```
3. 다운로드 후 `public/assets/units/[유닛명]_spritesheet.jpeg`에 저장
4. 이미지 실제 해상도 확인 → `frameWidth = 전체너비 ÷ 4`

| 항목 | 방법 A (자동) | 방법 B (Nano Banana) |
|---|---|---|
| 자동화 | ✅ 완전 자동 | ❌ 수동 |
| 그리드 정확도 | ✅ 코드로 보장 | ✅ 툴이 보장 |
| 캐릭터 일관성 | ⚠️ 프레임마다 미세 차이 | ✅ 높음 |
| 소요 시간 | 2~3분 | 5~10분 |
| 비용 | Gemini API 사용량 | 툴 플랜에 따라 다름 |

> **권장:** 빠른 개발 반복 → 방법 A / 최종 출시 에셋 → 방법 B

---

## 4. 추천 외부 AI 생성기 및 Nano Banana 활용

Google AI Pro가 만든 완벽한 프롬프트를 실제 사용 가능한 스프라이트로 변환하는 전문 도구들입니다.

### A. Nano Banana (AI Sprite Sheet Maker)
* **특징:** 프롬프트 한 번으로 애니메이션 프레임이 일정하게 정렬된 스프라이트 시트를 생성하는 데 특화된 툴입니다.
* **사용법:** Gemini Advanced로 작성한 디테일한 프롬프트를 입력하고, 'Sprite Sheet', 'Animation frames' 키워드를 포함해 다운로드한 뒤, Phaser 3 코드에서 분할하여 사용합니다.

### B. Scenario.com / Leonardo.ai
* **특징:** 자신만의 게임 스타일(예: 특정 색감과 비율의 픽셀 아트)을 학습시켜(LoRA) 일관된 화풍의 에셋을 무한정 뽑아낼 수 있습니다. 게임 내 유닛 간에 "그림체가 다른" 문제를 근본적으로 해결해 줍니다.
* **이점:** 고품질 게임 에셋 생산에 있어 가장 현업에서 많이 쓰이는 방식입니다.

## 5. 커스텀 MCP를 통한 이미지 생성 파이프라인 구축 (제안)

현재 프로젝트 설정에는 이미지 전용 MCP가 연결되어 있지 않습니다. 하지만 자동화를 원하신다면 다음과 같은 방법으로 MCP를 연동할 수 있습니다.

1. **외부 API 사용:** DALL-E 3 API, Leonardo API, 또는 Google Vertex AI Imagen 3 API를 사용합니다.
2. **커스텀 MCP 서버 스크립트 작성:** 해당 API에 요청을 보내고, 반환된 이미지를 프로젝트의 `public/assets/` 폴더에 직접 저장하고, 배경을 투명하게 날려주는(RemBG 등 활용) Node.js 기반의 MCP 서버를 만듭니다.
3. **통합:** Claude/Gemini AI 에이전트가 "탱크 스프라이트 만들어줘"라는 명령을 받으면, 직접 프롬프트를 다듬어 커스텀 MCP에 전달하고 프로젝트 에셋 폴더에 즉시 저장되도록 설계합니다.

---

**마무리 핵심 요약:**
고퀄리티 프로젝트를 위해서는 무작정 이미지를 생성하는 것을 넘어서 **"1. Gemini Advanced를 통한 완벽한 프롬프트 기획 -> 2. Nano Banana/Scenario 등 특화 툴을 통한 이미지 생성 -> 3. 필요시 MCP 연동을 통한 파이프라인 자동화"** 의 3단계가 필요합니다. 이 가이드를 통해 언제든 "대충 만든" 리소스가 아닌, 퀄리티 높은 에셋을 얻으시기 바랍니다.
