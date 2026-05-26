import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(process.cwd(), 'electron/main.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(process.cwd(), 'electron/preload.ts') },
      },
    },
  },
  renderer: {
    root: resolve(process.cwd(), 'src'),
    build: {
      rollupOptions: {
        input: resolve(process.cwd(), 'src/index.html'),
      },
    },
    plugins: [react()],
  },
})
