import { createApp } from 'vue'
import { createPinia } from 'pinia'
import popup from './components/popup.vue'

createApp(popup).use(createPinia()).mount('#app')
