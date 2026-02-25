# 고품질 게임 에셋 및 스프라이트 생성 가이드 (Google AI Pro 환경)

이 문서는 임시(Placeholder) 느낌의 대충 만든 이미지를 벗어나, **선명하고 전문적인 고품질 스프라이트 시트**를 제작하기 위한 워크플로우를 기록합니다. 사용자는 Google AI Pro(Gemini Advanced) 환경을 중심으로, Nano Banana와 같은 외부 AI/MCP를 활용하여 최고의 결과물을 얻도록 설계되었습니다.

## 1. Google AI Pro (Gemini Advanced) 활용 워크플로우

Gemini Advanced는 복잡한 맥락을 이해하고 매우 구체적인 프롬프트를 작성하는 데 강력합니다. 직접 이미지를 생성하기 전, **"최고의 프롬프트와 컨셉 아트"를 뽑아내는 기획자/아트 디렉터** 역할로 적극 활용해야 합니다.

1. **컨셉 도출 및 세부 설정:** Gemini Advanced에게 원하는 유닛의 배경, 재질, 조명, 애니메이션 종류를 설명하게 하여 시각적 세부 묘사를 텍스트로 완성합니다.
2. **에셋 프롬프트 최적화:** AI 이미지 제너레이터(Nano Banana, Scenario 등)가 가장 잘 이해하는 영문 프롬프트 형식으로 변환을 요청합니다.
3. **스프라이트 시트 구조 설계:** 걷기(Walk), 공격(Attack), 대기(Idle) 등 필요한 프레임 수와 배열(예: 4x4 그리드)을 AI와 미리 규정합니다.

## 2. "대충 만든 이미지(Placeholder)"를 피하는 프롬프트 작성법

고품질의 인게임 리소스를 얻기 위해서는 프롬프트에 **스타일, 해상도 조건, 배경 처리, 조명, 용도** 등의 키워드가 반드시 들어가야 합니다.

**명품 프롬프트를 위한 필수 키워드 예시:**
* **스타일:** `Highly detailed pixel art`, `16-bit SNES style`, `isometric 2.5d render`, `clean linework`, `vibrant colors`
* **형태 및 뷰:** `full body`, `sprite sheet`, `walk cycle animation frames`, `top-down perspective`, `orthographic`
* **배경:** `solid green background` (크로마키용/배경 제거 용이) 또는 `transparent background`, `solid white background`
* **품질:** `game asset`, `masterpiece`, `sharp focus`, `professional video game art`, `anti-aliasing`
* **배제어(Negative Prompt):** `blurry`, `messy`, `inconsistent`, `text`, `watermark`, `3d realistic` (픽셀아트인 경우)

**가이드 프롬프트 예제:**
> "A highly detailed pixel art sprite sheet of a futuristic cyberpunk space marine, top-down isometric view. Features a walk cycle and shooting animation. Arranged in a 4x4 grid. Clean edges, vibrant neon blue and dark grey armor. Solid white background for easy transparency removal. Professional indie game asset, sharp focus."

## 3. 추천 외부 AI 생성기 및 Nano Banana 활용

Google AI Pro가 만든 완벽한 프롬프트를 실제 사용 가능한 스프라이트로 변환하는 전문 도구들입니다.

### A. Nano Banana (AI Sprite Sheet Maker)
* **특징:** 프롬프트 한 번으로 애니메이션 프레임이 일정하게 정렬된 스프라이트 시트를 생성하는 데 특화된 툴입니다.
* **사용법:** Gemini Advanced로 작성한 디테일한 프롬프트를 입력하고, 'Sprite Sheet', 'Animation frames' 키워드를 포함해 다운로드한 뒤, Phaser 3 코드에서 분할하여 사용합니다.

### B. Scenario.com / Leonardo.ai
* **특징:** 자신만의 게임 스타일(예: 특정 색감과 비율의 픽셀 아트)을 학습시켜(LoRA) 일관된 화풍의 에셋을 무한정 뽑아낼 수 있습니다. 게임 내 유닛 간에 "그림체가 다른" 문제를 근본적으로 해결해 줍니다.
* **이점:** 고품질 게임 에셋 생산에 있어 가장 현업에서 많이 쓰이는 방식입니다.

## 4. 커스텀 MCP를 통한 이미지 생성 파이프라인 구축 (제안)

현재 프로젝트 설정에는 이미지 전용 MCP가 연결되어 있지 않습니다. 하지만 자동화를 원하신다면 다음과 같은 방법으로 MCP를 연동할 수 있습니다.

1. **외부 API 사용:** DALL-E 3 API, Leonardo API, 또는 Google Vertex AI Imagen 3 API를 사용합니다.
2. **커스텀 MCP 서버 스크립트 작성:** 해당 API에 요청을 보내고, 반환된 이미지를 프로젝트의 `public/assets/` 폴더에 직접 저장하고, 배경을 투명하게 날려주는(RemBG 등 활용) Node.js 기반의 MCP 서버를 만듭니다.
3. **통합:** Claude/Gemini AI 에이전트가 "탱크 스프라이트 만들어줘"라는 명령을 받으면, 직접 프롬프트를 다듬어 커스텀 MCP에 전달하고 프로젝트 에셋 폴더에 즉시 저장되도록 설계합니다.

---

**마무리 핵심 요약:**
고퀄리티 프로젝트를 위해서는 무작정 이미지를 생성하는 것을 넘어서 **"1. Gemini Advanced를 통한 완벽한 프롬프트 기획 -> 2. Nano Banana/Scenario 등 특화 툴을 통한 이미지 생성 -> 3. 필요시 MCP 연동을 통한 파이프라인 자동화"** 의 3단계가 필요합니다. 이 가이드를 통해 언제든 "대충 만든" 리소스가 아닌, 퀄리티 높은 에셋을 얻으시기 바랍니다.
