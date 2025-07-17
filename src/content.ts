import { createApp, defineCustomElement } from 'vue'
import ContentCe from './components/content.ce.vue'
import Content from './components/content.vue'

import './style/index.scss'

const root = document.createElement('div')

root.id = 'crx-root'
document.body.append(root)

const contentElement = defineCustomElement(ContentCe)

customElements.define('crx-content', contentElement)

createApp(Content).mount(root)
