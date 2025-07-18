<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'

const prefix = 'crx-popup'
const floatBubbleOpened = ref(true)

chrome.storage.local.get(['floatBubbleOpened']).then((result) => {
  const opened = result.floatBubbleOpened

  if (opened !== undefined) {
    floatBubbleOpened.value = opened
  }
  else {
    floatBubbleOpened.value = true
  }

  watch(floatBubbleOpened, (val) => {
    chrome.storage.local.set({ floatBubbleOpened: val })
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'popup', floatBubbleOpened: val })
        }
      })
    })
  })
})
</script>

<template>
  <div :class="prefix">
    <div :class="`${prefix}__header`">
      <el-icon size="18">
        <Setting />
      </el-icon>
      <span style="margin-left: 5px;">设置</span>
    </div>
    <div :class="`${prefix}__content`">
      <div class="setting-item">
        <div class="setting-item__label">
          悬浮球关/开
        </div>
        <el-switch v-model="floatBubbleOpened" size="small" />
      </div>
    </div>
    <div :class="`${prefix}__footer`">
      <div class="external-links">
        <el-link
          href="https://gitee.com/hzz-0809/barrage-chrome-extension"
          target="_blank"
          underline="never"
        >
          <img class="external-links__icon" src="@/assets/gitee.svg">
        </el-link>
        <el-link
          href="https://github.com/moyu-king/barrage-chrome-extension"
          target="_blank"
          underline="never"
        >
          <img class="external-links__icon" src="@/assets/github.svg">
        </el-link>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.crx-popup {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 300px;
  color: rgba(#000, 75%);

  &__header {
    display: flex;
    align-items: center;
    font-size: 16px;
    padding: 5px 15px;
    font-weight: 700;
    border-bottom: 1px solid rgba(#000, 12%);
  }

  &__content {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    flex: 1;
    overflow: hidden;
    padding: 10px 15px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: 32px;
    padding: 0 15px;
    background-color: #eeeff2;

    .external-links {
      display: flex;
      align-items: center;
      gap: 5px;

      &__icon {
        width: 24px;
        height: 24px;
      }
    }
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;

    &__label {
      margin-right: 10px;
    }
  }
}
</style>
