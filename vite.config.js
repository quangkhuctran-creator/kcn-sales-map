import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    // Tell the app Cesium is global from CDN
    'window.CESIUM_BASE_URL': JSON.stringify('https://cesium.com/downloads/cesiumjs/releases/1.115/Build/Cesium/'),
  },
})
