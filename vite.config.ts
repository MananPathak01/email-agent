import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(async () => {
    const plugins = [react(), runtimeErrorOverlay(),];


    return {
        plugins,
        resolve: {
            alias: {
                "@": resolve(__dirname, "client", "src"),
                "@shared": resolve(__dirname, "shared"),
                "@assets": resolve(__dirname, "attached_assets")
            }
        },
        root: resolve(__dirname, "client"),
        server: {
            port: 5173,
            strictPort: true,
            proxy: { // Proxy API requests to the backend server
                '/api': {
                    target: 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                    configure: (proxy: any, _options: any) => {
                        proxy.on('error', (err: Error, _req: any, _res: any) => {
                            console.error('Proxy error:', err);
                        });
                        proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
                            console.log('Proxying request:', req.method, req.url);
                        });
                    }
                },
                // Proxy WebSocket connections
                '/ws': {
                    target: 'ws://localhost:5000',
                    ws: true,
                    changeOrigin: true
                }
            },
            hmr: {
                overlay: false // This will disable the error overlay
            },
            fs: {
                strict: true,
                deny: ["**/.*"]
            }
        },
        build: {
            outDir: resolve(__dirname, "dist"),
            emptyOutDir: true,
            rollupOptions: {
                output: {
                    manualChunks: undefined
                }
            }
        },
        base: '/'
    };
});
