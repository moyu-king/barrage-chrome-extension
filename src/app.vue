<script setup lang="ts">
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
  <el-button type="primary" @click="sendMessageToContent({ type: 'play' })">开始</el-button>
  <el-button type="warning" @click=" sendMessageToContent({ type: 'stop' })">暂停</el-button>
  <el-button type="success" @click="sendMessageToContent({ type: 'show' })">显示</el-button>
  <el-button type="warning" @click=" sendMessageToContent({ type: 'hidden' })">隐藏</el-button>
  <el-button type="info" @click=" sendMessageToContent({ type: 'reset' })">重置</el-button>
</template>

<style>
#app {
  width: 400px;
  height: 300px;
}
</style>
