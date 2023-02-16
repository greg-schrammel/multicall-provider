import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, './src/withMulticall.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@wagmi/core', 'ethers'],
    },
    target: 'esnext',
    sourcemap: true,
  },
})
