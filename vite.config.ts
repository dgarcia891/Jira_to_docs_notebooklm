/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        crx({ manifest }),
    ],
    server: {
        port: 5173,
        strictPort: true,
        cors: true,
        hmr: {
            port: 5173,
        },
    },
    build: {
        sourcemap: process.env.NODE_ENV === 'development',
        minify: process.env.NODE_ENV !== 'development',
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
})
