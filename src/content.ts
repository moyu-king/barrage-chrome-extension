import { createPinia } from 'pinia'
import { createApp, defineCustomElement } from 'vue'
import Content from './components/content.vue'
import Side from './components/side.ce.vue'

import './style/index.scss'

const root = document.createElement('div')

root.id = 'crx-root'
document.body.append(root)

const sideElement = defineCustomElement(Side)
customElements.define('crx-side', sideElement)

createApp(Content).use(createPinia()).mount(root)
