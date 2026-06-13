import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages: https://adikarthikeya2003.github.io/ride-fare-india/
  base: process.env.NODE_ENV === 'production' ? '/ride-fare-india/' : '/',
})
