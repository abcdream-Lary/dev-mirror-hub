import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base: './' 使打包产物可部署到任意子路径（如 GitHub Pages）
export default defineConfig({
  base: './',
  plugins: [vue()]
})