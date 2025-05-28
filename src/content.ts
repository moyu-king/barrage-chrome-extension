import { createApp } from 'vue'
import Barrage from './components/barrage.vue'

import './style/content.scss'

const root = document.createElement('div')

root.id = 'crx-root'
document.body.append(root)

createApp(Barrage).mount(root)