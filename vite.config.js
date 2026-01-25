import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' deve ser o nome do seu repositório no GitHub para o deploy funcionar
  base: './', 
})