// Vite config (reloaded to clear esbuild crash)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const reactLikePackages = [
    'react',
    'react-dom',
    'react-is',
    'scheduler',
    'use-sync-external-store',
    'loose-envify',
    'prop-types',
    'object-assign',
]

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/static/' : '/',
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
            // Required for MediaPipe WASM to use SharedArrayBuffer (multi-threaded inference).
            // 'credentialless' (not 'require-corp') achieves cross-origin isolation without
            // requiring every cross-origin resource (product/contact-lens images served
            // straight from the Django backend on :8000) to carry a Cross-Origin-Resource-Policy
            // header — 'require-corp' silently blocked those image loads in the browser.
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        proxy: {
            // SSE live-stream endpoint — must NOT buffer, must NOT compress
            '/api/sales/analytics/live-stream': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                // Disable compression so Django streams raw text/event-stream
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq) => {
                        // Remove Accept-Encoding so Django won't gzip/deflate the stream
                        proxyReq.setHeader('Accept-Encoding', 'identity');
                    });
                    proxy.on('proxyRes', (proxyRes) => {
                        // Disable http-proxy internal buffering for SSE
                        proxyRes.headers['content-type'] = 'text/event-stream';
                        proxyRes.headers['cache-control'] = 'no-cache';
                        proxyRes.headers['x-accel-buffering'] = 'no';
                    });
                },
            },
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
        // Target modern browsers only — smaller output, faster parsing
        target: 'esnext',
        // Keep production bundles readable and easier to inspect during debugging
        minify: false,
        cssMinify: false,
        // Increase chunk warn limit slightly (admin bundle is large by design)
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                // Split vendors into long-lived cached chunks while avoiding React runtime circular references
                manualChunks(id) {
                    if (id.includes('node_modules/')) {
                        const normalized = id.replace(/\\/g, '/');

                        if (reactLikePackages.some(pkg => normalized.includes(`/node_modules/${pkg}/`))) {
                            return 'vendor-react';
                        }

                        if (normalized.includes('/node_modules/react-router')) {
                            return 'vendor-router';
                        }

                        if (normalized.includes('/node_modules/lucide-react')) {
                            return 'vendor-icons';
                        }

                        if (
                            normalized.includes('/node_modules/recharts') ||
                            normalized.includes('/node_modules/d3') ||
                            normalized.includes('/node_modules/victory-vendor')
                        ) {
                            return 'vendor-charts';
                        }

                        if (normalized.includes('/node_modules/@react-oauth')) {
                            return 'vendor-oauth';
                        }

                        if (normalized.includes('/node_modules/axios') || normalized.includes('/node_modules/follow-redirects')) {
                            return 'vendor-axios';
                        }

                        return 'vendor-misc';
                    }
                },
            },
        },
        // Disable source maps in production for smaller output
        sourcemap: false,
    },
})
