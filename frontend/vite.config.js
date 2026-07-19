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
                // Split vendors into long-lived cached chunks
                manualChunks(id) {
                    // React core — highest cache priority, almost never changes
                    if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                        return 'vendor-react';
                    }
                    // Router
                    if (id.includes('node_modules/react-router')) {
                        return 'vendor-router';
                    }
                    // Lucide icons (large icon library used heavily in admin)
                    if (id.includes('node_modules/lucide-react')) {
                        return 'vendor-icons';
                    }
                    // Recharts + bundled D3 — isolate into its own chunk so it only
                    // loads when AnalyticsPage or DashboardHome is visited.
                    // This alone removes 579KB from the critical path.
                    if (
                        id.includes('node_modules/recharts') ||
                        id.includes('node_modules/d3') ||
                        id.includes('node_modules/d3-') ||
                        id.includes('node_modules/victory-vendor')
                    ) {
                        return 'vendor-charts';
                    }
                    // Google OAuth
                    if (id.includes('node_modules/@react-oauth')) {
                        return 'vendor-oauth';
                    }
                    // Axios — small but used everywhere; own chunk for cache stability
                    if (id.includes('node_modules/axios') || id.includes('node_modules/follow-redirects')) {
                        return 'vendor-axios';
                    }
                    // All other node_modules go into a general vendor chunk
                    if (id.includes('node_modules/')) {
                        return 'vendor-misc';
                    }
                },
            },
        },
        // Disable source maps in production for smaller output
        sourcemap: false,
    },
})
