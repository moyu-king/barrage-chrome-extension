import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import manifest from './manifest.json' assert { type: 'json' }
import { crx } from '@crxjs/vite-plugin'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'node:path'

export default defineConfig({
  server: {
    cors: true,
    host: '0.0.0.0',
    origin: 'http://127.0.0.1:5173'
  },
  plugins: [
    vue(),
    crx({ manifest }),
    Icons({ autoInstall: true }),
    AutoImport({
      imports: ['vue'],
      resolvers: [
        ElementPlusResolver(),
        IconsResolver({ prefix: 'Icon' }),
      ],
      dts: resolve(__dirname, 'src', 'types/auto-imports.d.ts')
    }),
    Components({
      resolvers: [
        IconsResolver({ enabledCollections: ['ep']}),
        ElementPlusResolver()
      ],
      dts: resolve(__dirname, 'src', 'types/components.d.ts')
    })
  ]
})
