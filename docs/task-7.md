# Task 7 — PWA + 배포 최적화

> 담당 에이전트: `deploy-agent`
> 의존성: **Task 1~6 모두 완료 후** 착수
> 최종 Task

---

## 목표

PWA 설정, Vercel 배포, 모바일 터치 최적화, 60FPS 성능 보장을 완성한다.
`npm run preview` 결과와 Vercel 배포 결과가 동일하게 동작함을 보장한다.

---

## 생성/수정할 파일 목록

```
프로젝트 루트
├── vercel.json                     ← SPA fallback (Task 1에서 생성, 여기서 완성)
├── vite.config.ts                  ← PWA 플러그인 추가
└── public/
    ├── manifest.json               ← PWA 매니페스트
    └── icons/
        ├── icon-192.png            ← PWA 아이콘 (placeholder)
        └── icon-512.png            ← PWA 아이콘 (placeholder)

src/
├── game/
│   └── scenes/
│       └── BattleScene.ts          ← Object Pool 최적화 검증 (수정)
└── app/
    └── ui/
        └── BattleHUD.tsx           ← 터치 이벤트 최적화 (수정)
```

---

## 구현 상세

### vercel.json — SPA fallback 완성

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### public/manifest.json — PWA 매니페스트

```json
{
  "name": "머나먼약속",
  "short_name": "약속",
  "description": "모바일 RTS — 영토 점령 전략 게임",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### vite.config.ts — PWA 플러그인 추가

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,   // public/manifest.json 직접 사용
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
  base: process.env.BASE_URL ?? '/',
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react:  ['react', 'react-dom'],
          vendor: ['eventemitter3', 'zustand'],
        },
      },
    },
  },
});
```

패키지 추가:
```bash
npm install -D vite-plugin-pwa
```

---

## index.html — PWA 링크 추가

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#1a1a2e" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  <title>머나먼약속</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 60FPS 성능 체크리스트

### Phaser BattleScene 검증 항목

```typescript
// ✅ update() 루프 내 금지 패턴 확인
// ❌ 금지: new Phaser.Math.Vector2()
// ✅ 허용: 멤버 변수로 선언한 _velocity.set(x, y)

// ✅ Graphics 재드로우 최적화
// ❌ 금지: 매 프레임 hpBar.clear() + hpBar.fillRect()
// ✅ 허용: HP 값이 변경된 경우에만 redrawHpBar() 호출

// ✅ Object Pool 확인
// BattleScene 내 투사체, 파티클 → ObjectPool 사용 여부
// Pool 크기: 유닛 20개, 투사체 40개

// ✅ Camera/Culling
// 화면 밖 유닛/투사체 update 스킵 (Phaser 기본 culling 활용)
```

### CSS 최적화

```css
/* src/index.css */
* { touch-action: pan-x pan-y; }        /* 불필요한 터치 딜레이 방지 */
body { overscroll-behavior: none; }     /* 스크롤 bounce 방지 */
canvas { touch-action: none; }          /* Phaser canvas 터치 전용 */
```

### 환경변수 분리

```
.env
  VITE_APP_TITLE=머나먼약속

.env.development
  BASE_URL=/

.env.production
  BASE_URL=/
  VITE_PHASER_DEBUG=false
```

---

## Capacitor 준비 (PWA → 앱 변환)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init 머나먼약속 com.promise.game --web-dir dist
npx cap add android
npx cap add ios
```

`capacitor.config.ts`:
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.promise.game',
  appName: '머나먼약속',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;
```

---

## 배포 워크플로

```bash
# 1. 로컬 검증
npm run build
npm run preview     # → http://localhost:4173 에서 Vercel과 동일 동작 확인

# 2. Vercel 배포
# vercel.json이 있으면 자동으로 SPA fallback 적용
# GitHub 연동 후 main 브랜치 push → 자동 배포

# 3. Capacitor 빌드 (선택)
npm run build
npx cap sync
npx cap run android
```

---

## 완료 조건

- [ ] `npm run preview` → 앱 정상 동작, SPA 라우팅 확인
- [ ] PWA: 모바일 Chrome "홈 화면에 추가" 동작
- [ ] 오프라인 캐싱: 첫 로딩 후 오프라인에서도 동작
- [ ] 아이콘 192/512 표시
- [ ] 빌드 청크 분리: phaser / react / vendor 별도
- [ ] 터치 딜레이 없음 (`touch-action: none` 확인)
- [ ] 10유닛 + 20발 투사체 60FPS 유지 확인
- [ ] `update()` 내 `new` 키워드 없음 최종 확인
- [ ] TypeScript strict 빌드 오류 없음
