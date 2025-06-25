// 设置打包路径为相对路径
import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // 设置为相对路径，确保资源引用使用相对路径
  build: {
    outDir: 'dist', // 输出目录
    assetsDir: 'assets' // 静态资源目录
  }
})
