import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

export default defineConfig({
  plugins: [glsl()],
  base: '/webgl/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: 'assets/[name].js',
        entryFileNames: 'assets/[name].js'
      }
    }
  }
})