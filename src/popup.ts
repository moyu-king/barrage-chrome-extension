import { createApp } from 'vue'
import { createPinia } from 'pinia'
import popup from './components/popup.vue'

import './style/index.scss'

createApp(popup).use(createPinia()).mount('#app')
