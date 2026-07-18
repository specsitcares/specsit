// Vite config (reloaded to clear esbuild crash)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/static/' : '/',
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5174,
        strictPort: true,
        headers: {
            // Required for MediaPipe WASM to use SharedArrayBuffer (multi-threaded inference)
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/media': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        }
    },
    optimizeDeps: {
        // @mediapipe/tasks-vision ships WASM binaries that esbuild cannot bundle.
        // Exclude it so Vite fetches it at runtime from the CDN as-is.
        exclude: ['@mediapipe/tasks-vision'],
    },
    build: {
        outDir: '../backend/staticfiles_dist',
        emptyOutDir: true,
    }
})

