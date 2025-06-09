import { createPinia } from 'pinia'
import { createApp } from 'vue'
import popup from './components/popup.vue'

import './style/index.scss'

createApp(popup).use(createPinia()).mount('#app')
