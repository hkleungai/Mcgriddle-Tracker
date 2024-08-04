import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    get base() {
        switch (mode) {
            case 'development': {
                return '/';
            }

            case 'production': {
                return '/Mcgriddle-Tracker';
            }

            default: {
                throw new Error(`Nah config.mode="${mode}" is not yet supported.`);
            }
        }
    },
    plugins: [react()],
}))
