<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'

const prefix = 'crx-popup'
const menus = ['腾讯视频', 'bilibili']
const currentMenu = ref('腾讯视频')
const isOpen = ref(false)

function sendMessageToContent(params: Record<string, any>) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    tabs => {
      chrome.tabs.sendMessage(tabs[0].id!, params)
    }
  )
}
</script>

<template>
  <div :class="prefix">
    <div :class="`${prefix}__header`">
      <div :class="`${prefix}__title`">
        <el-icon size="18">
          <Setting />
        </el-icon>
        <span>控制面板</span>
      </div>
      <el-switch v-model="isOpen" />
    </div>
    <el-segmented v-model="currentMenu" :options="menus" />
    <el-scrollbar ref="scrollbarRef" height="200px">
      <div ref="innerRef">
        <p v-for="item in 20" :key="item" class="scrollbar-demo-item">
          {{ item }}
        </p>
      </div>
    </el-scrollbar>
    <div :class="`${prefix}__control`">
      <el-button type="primary" @click="sendMessageToContent({ type: 'play' })">开始</el-button>
      <el-button type="warning" @click=" sendMessageToContent({ type: 'stop' })">暂停</el-button>
      <el-button type="success" @click="sendMessageToContent({ type: 'show' })">显示</el-button>
      <el-button type="warning" @click=" sendMessageToContent({ type: 'hidden' })">隐藏</el-button>
      <el-button type="info" @click=" sendMessageToContent({ type: 'reset' })">重置</el-button>
    </div>
  </div>
</template>

<style></style>
