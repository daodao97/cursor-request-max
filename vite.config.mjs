import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath, URL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/react"),
        },
    },
    build: {
        outDir: path.resolve(__dirname, 'assets'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'src/react/index.html'),
            output: {
                entryFileNames: 'react-app.js',
                chunkFileNames: 'react-chunk-[name].js',
                assetFileNames: 'react-asset-[name].[ext]'
            }
        }
    },
    root: 'src/react',
    publicDir: false
}) 