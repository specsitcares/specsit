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
        outDir: '../backend/staticfiles_dist',
        emptyOutDir: true,
    }
})
