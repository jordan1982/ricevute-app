import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(() => ({
  base: './',
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1500,
  },
  css: {
    postcss: { plugins: [autoprefixer({})] },
    preprocessorOptions: {
      scss: { quietDeps: true, silenceDeprecations: ['import', 'legacy-js-api'] },
    },
  },
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  plugins: [
    react(),
    nodePolyfills({
      // Abilita i polyfill necessari per Buffer, stream, util, ecc.
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: [{ find: 'src/', replacement: `${path.resolve(__dirname, 'src')}/` }],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
  },
  server: { port: 3000 },
}))