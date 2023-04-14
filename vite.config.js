import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: './src/index.ts',
        wagmi: './src/wagmi.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@wagmi/core', 'ethers'],
    },
    target: 'esnext',
    sourcemap: true,
  },
})
