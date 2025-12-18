import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // REPLACE 'showflow' with your exact GitHub repository name
  // If your repo is https://github.com/user/my-app, this should be '/my-app/'
  base: '/showflow/', 
})