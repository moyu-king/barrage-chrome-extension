<script setup lang="ts">
const floatBubbleOpened = ref(false)

chrome.storage.local.get(['floatBubbleOpened']).then((result) => {
  const opened = result.floatBubbleOpened

  if (opened !== undefined) {
    floatBubbleOpened.value = opened
  }
  else {
    floatBubbleOpened.value = true
  }
})
</script>

<template>
  <crx-content v-if="floatBubbleOpened" />
</template>
