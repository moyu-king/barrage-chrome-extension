<script setup lang="ts">
import { Search, Setting } from '@element-plus/icons-vue'
import { defineAsyncComponent } from 'vue'

const SearchPanel = defineAsyncComponent(() => import('./search-panel.vue'))

const prefix = 'crx-popup'
const activeTab = ref<'search' | 'settings'>('search')
const floatBubbleOpened = ref(true)
const isCustomPlay = ref(false)

chrome.storage.local.get(['floatBubbleOpened', 'isCustomPlay']).then((result) => {
  // 悬浮球显示
  if (result.floatBubbleOpened !== undefined) {
    floatBubbleOpened.value = result.floatBubbleOpened
  }
  else {
    floatBubbleOpened.value = true
  }

  // 播放模式
  if (result.isCustomPlay !== undefined) {
    isCustomPlay.value = result.isCustomPlay
  }

  watch(floatBubbleOpened, (val) => {
    chrome.storage.local.set({ floatBubbleOpened: val })
    sendMsgToAllContent({ floatBubbleOpened: val })
  })

  watch(isCustomPlay, (val) => {
    chrome.storage.local.set({ isCustomPlay: val })
    sendMsgToAllContent({ isCustomPlay: val })
  }, { immediate: true })
})

function sendMsgToAllContent(msg: Record<string, any>) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'popup', ...msg })
      }
    })
  })
}
</script>

<template>
  <div :class="prefix">
    <div :class="`${prefix}__header`">
      <div
        :class="`${prefix}__tab`"
        :data-active="activeTab === 'search'"
        @click="activeTab = 'search'"
      >
        <el-icon size="16">
          <Search />
        </el-icon>
        <span>搜索</span>
      </div>
      <div
        :class="`${prefix}__tab`"
        :data-active="activeTab === 'settings'"
        @click="activeTab = 'settings'"
      >
        <el-icon size="16">
          <Setting />
        </el-icon>
        <span>设置</span>
      </div>
    </div>
    <div :class="`${prefix}__content`">
      <SearchPanel v-if="activeTab === 'search'" />
      <template v-if="activeTab === 'settings'">
        <div class="setting-item">
          <div class="setting-item__label">
            悬浮球关/开
          </div>
          <el-switch v-model="floatBubbleOpened" size="small" />
        </div>
        <div class="setting-item">
          <div class="setting-item__label">
            自动播放模式/自定义播放模式
          </div>
          <el-switch v-model="isCustomPlay" size="small" />
        </div>
      </template>
    </div>
    <div :class="`${prefix}__footer`">
      <el-link
        href="https://github.com/moyu-king/barrage-chrome-extension/blob/master/README.md"
        target="_blank"
        underline="never"
      >
        使用指南
      </el-link>
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
  width: 400px;
  height: 550px;
  color: rgba(#000, 75%);

  &__header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid rgba(#000, 12%);
  }

  &__tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    flex: 1;
    padding: 10px 0;
    font-size: 14px;
    cursor: pointer;
    color: rgba(#000, 45%);
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    user-select: none;

    &[data-active="true"] {
      color: rgba(#000, 85%);
      border-bottom-color: #ffd100;
    }

    &:hover:not([data-active="true"]) {
      color: rgba(#000, 65%);
    }
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
    justify-content: space-between;
    height: 32px;
    padding: 0 15px;
    background-color: #eeeff2;

    .external-links {
      display: flex;
      align-items: center;
      gap: 5px;

      &__icon {
        width: 20px;
        height: 20px;
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
