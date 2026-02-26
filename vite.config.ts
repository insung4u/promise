import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Vite 빌드 설정
// Phaser / React / vendor 청크 분리 + PWA 서비스워커(Workbox) 오프라인 캐싱
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // public/manifest.json을 직접 사용 (플러그인 자동 생성 비활성)
      manifest: false,
      // registerType: 새 버전 감지 시 자동 업데이트
      registerType: 'autoUpdate',
      // sw.js를 public/에 직접 두지 않고 Workbox가 생성하도록 설정
      injectRegister: null,
      workbox: {
        // 빌드 산출물 중 캐싱할 파일 패턴
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpeg,jpg,webp}'],
        runtimeCaching: [
          {
            // 이미지 파일: CacheFirst (오프라인 우선)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // JS/CSS 에셋: StaleWhileRevalidate (캐시 사용 후 백그라운드 갱신)
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets-cache' },
          },
        ],
      },
    }),
  ],
  base: process.env.BASE_URL ?? '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser: 가장 큰 청크 — 별도 분리로 초기 로드 병렬화
          phaser: ['phaser'],
          // React 코어
          react: ['react', 'react-dom'],
          // 상태관리 + 이벤트버스 — 작은 유틸리티 묶음
          vendor: ['eventemitter3', 'zustand'],
        },
      },
    },
  },
})
