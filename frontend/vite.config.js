// Vite config (reloaded to clear esbuild crash)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    base: process.env.VERCEL
        ? '/'
        : (process.env.NODE_ENV === 'production' ? '/static/' : '/'),
    // Read VITE_* vars from the single project-wide .env at the repo root
    envDir: '..',
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        port: 5174,
        strictPort: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
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
    build: {
        outDir: process.env.VERCEL
            ? 'dist'
            : '../backend/staticfiles_dist',
        emptyOutDir: true,
    }
})
