import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Barrage from './components/barrage.vue'

import './style/index.scss'

const root = document.createElement('div')

root.id = 'crx-root'
document.body.append(root)

createApp(Barrage).use(createPinia()).mount(root)