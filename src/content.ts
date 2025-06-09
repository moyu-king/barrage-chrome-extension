import { createPinia } from 'pinia'
import { createApp } from 'vue'
import Barrage from './components/barrage.vue'

import './style/index.scss'

const root = document.createElement('div')

root.id = 'crx-root'
document.body.append(root)

createApp(Barrage).use(createPinia()).mount(root)
