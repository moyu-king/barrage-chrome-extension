import { resolve } from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import manifest from './manifest.json' assert { type: 'json' }

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.+)/, replacement: resolve(__dirname, 'src/$1') },
    ],
  },
  server: {
    cors: true,
    host: '0.0.0.0',
    origin: 'http://127.0.0.1:5173',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'crx-content',
        },
      },
    }),
    crx({ manifest }),
    Icons({ autoInstall: true }),
    AutoImport({
      imports: ['vue'],
      resolvers: [
        ElementPlusResolver(),
        IconsResolver({ prefix: 'Icon' }),
      ],
      dts: resolve(__dirname, 'src', 'types/auto-imports.d.ts'),
    }),
    Components({
      resolvers: [
        IconsResolver({ enabledCollections: ['ep'] }),
        ElementPlusResolver(),
      ],
      dts: resolve(__dirname, 'src', 'types/components.d.ts'),
    }),
  ],
})
