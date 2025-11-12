import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react()
    ],
    alias: {
        '@mui/styled-engine': '@mui/styled-engine-sc',
    },resolve: {
        build: {
            outDir: '../resources/static', // <-- VERY IMPORTANT
            emptyOutDir: true,
        }
    }
})
