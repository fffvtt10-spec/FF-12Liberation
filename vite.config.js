import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/FF-12Liberation/', // O nome do seu repositório deve estar entre barras
})