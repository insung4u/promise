import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite 빌드 설정
// Phaser와 React를 별도 청크로 분리하여 초기 로드 최적화
export default defineConfig({
  plugins: [react()],
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
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
