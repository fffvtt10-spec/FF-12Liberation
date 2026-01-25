import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()], // Este plugin é OBRIGATÓRIO para o React funcionar no build
  base: '/FF-12Liberation/', 
})