<script setup lang="ts">
function playBarrage() {
  sendMessageToContent({ type: 'play' })
}

function stopBarrage() {
  sendMessageToContent({ type: 'stop' })
}

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
  <el-button type="primary" @click="playBarrage">开始</el-button>
  <el-button type="danger" @click="stopBarrage">暂停</el-button>
</template>

<style>
#app {
  width: 400px;
  height: 300px;
}
</style>
