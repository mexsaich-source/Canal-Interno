import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Chrome >= 47', 'Safari >= 10'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
    }),
  ],
  server: {
    host: true,
  },
  build: {
    minify: 'terser',
    target: 'es2015',
    chunkSizeWarningLimit: 1000, // Quita la advertencia amarilla de los 500kB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Divide el código pesado en partes más pequeñas para que la TV lo cargue más fácil
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})