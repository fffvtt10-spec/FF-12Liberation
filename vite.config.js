import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()], // Este plugin automatiza a importação do React no JSX
  base: '/FF-12Liberation/', 
})