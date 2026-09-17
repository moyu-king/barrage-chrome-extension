<script setup lang="ts">
import type { SearchResult, VideoCreateOpt } from '@/service'
import { Loading, Search } from '@element-plus/icons-vue'
import { MessageType } from '@/message-type'
import { isSearchResultValid, matchManualAddPlatform } from '@/service'
import { Platform } from '@/service/base'

const platformOptions = [
  { label: 'bilibili', value: Platform.BILIBILI },
  { label: '腾讯视频', value: Platform.TENCENT },
  { label: '爱奇艺', value: Platform.IQIYI },
]

const selectedPlatform = ref<Platform>(Platform.BILIBILI)
const keyword = ref('')
const searching = ref(false)
const results = ref<SearchResult[]>([])
const searched = ref(false)
const errorMsg = ref('')
const addingSet = ref<Set<string>>(new Set())
let searchSeq = 0

/* ==================== 当前页面（手动添加） ==================== */
const pageTab = ref<{ id: number, url: string, title: string } | null>(null)
const pageAdding = ref(false)

const pagePlatform = computed(() => matchManualAddPlatform(pageTab.value?.url))

// 不搜索时结果区让位给「当前页面」卡片，可手动添加才显示
const showPageCard = computed(() => (
  !searching.value && !searched.value && !keyword.value.trim() && !!pagePlatform.value
))

function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]))
  })
}

// popup 每次打开都是新实例，不需要监听标签页变化
queryActiveTab().then((tab) => {
  if (!tab?.id || !tab.url)
    return

  pageTab.value = { id: tab.id, url: tab.url, title: tab.title || '' }

  // 平台选择器对齐当前页面：卡片与搜索结果默认就落在你正在看的站点上
  const platform = matchManualAddPlatform(tab.url)
  if (platform)
    selectedPlatform.value = platform
})

function platformLabel(platform?: Platform): string {
  return platformOptions.find(item => item.value === platform)?.label ?? ''
}

function getResultKey(result: SearchResult): string {
  return `${result.platform}-${JSON.stringify(result.params)}`
}

function metaText(result: SearchResult): string {
  return [result.typeName, result.year].filter(Boolean).join(' · ')
}

function resetResults() {
  results.value = []
  searched.value = false
  errorMsg.value = ''
}

watch(selectedPlatform, () => {
  resetResults()
})

// 清空搜索框即回到空闲态，卡片重新出现
watch(keyword, (value) => {
  if (!value.trim())
    resetResults()
})

/**
 * 创建视频并广播给内容脚本，搜索添加与手动添加共用
 */
function sendCreateVideo(data: VideoCreateOpt): Promise<{ ok: boolean, message?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: MessageType.CREATE_VIDEO,
      data,
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, message: chrome.runtime.lastError.message })
        return
      }

      if (!response?.data) {
        resolve({ ok: false, message: response?.message })
        return
      }

      chrome.runtime.sendMessage({
        type: MessageType.SYNC_CONTENT_DATA,
        video: response.data,
      })
      resolve({ ok: true })
    })
  })
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) {
    errorMsg.value = '请输入搜索关键词'
    searched.value = true
    results.value = []
    return
  }

  const seq = ++searchSeq
  searching.value = true
  errorMsg.value = ''
  results.value = []
  searched.value = false

  chrome.runtime.sendMessage(
    { type: MessageType.SEARCH_VIDEO, platform: selectedPlatform.value, keyword: kw, page: 1 },
    (response) => {
      // 丢弃过期响应，避免连点覆盖
      if (seq !== searchSeq)
        return

      searching.value = false
      searched.value = true

      if (chrome.runtime.lastError) {
        errorMsg.value = chrome.runtime.lastError.message || '搜索失败，请稍后重试'
        return
      }

      if (!response || response.status === 0) {
        errorMsg.value = response?.message || '搜索失败，请稍后重试'
        return
      }

      results.value = (response.data || []).filter(isSearchResultValid)

      if (results.value.length === 0)
        errorMsg.value = '未找到相关剧集'
    },
  )
}

async function addVideo(result: SearchResult) {
  if (!isSearchResultValid(result)) {
    ElMessage.error('该结果缺少必要参数，无法添加')
    return
  }

  const key = getResultKey(result)
  if (addingSet.value.has(key))
    return

  addingSet.value = new Set([...addingSet.value, key])

  const res = await sendCreateVideo({
    name: result.title,
    platform: result.platform,
    params: result.params,
  })

  addingSet.value = new Set([...addingSet.value].filter(k => k !== key))

  if (res.ok)
    ElMessage.success('添加成功')
  else
    ElMessage.error(res.message || '添加失败')
}

/**
 * 交给页面弹确认框：参数解析（爱奇艺要读页面 DOM）与保存都在内容脚本里完成。
 * 成功时页面已经在弹窗了，popup 随即关闭，免得挡住它。
 */
function handlePageAdd() {
  const tab = pageTab.value
  if (!tab)
    return

  pageAdding.value = true

  chrome.tabs.sendMessage(tab.id, { type: MessageType.OPEN_ADD_PANEL }, (response) => {
    pageAdding.value = false

    if (chrome.runtime.lastError) {
      ElMessage.error('未能打开添加弹窗，请检查悬浮球开关或刷新页面')
      return
    }

    // 解析失败的原因由页面回报，留在 popup 上显示
    if (!response?.status) {
      ElMessage.error(response?.message || '未能识别出视频资源！')
      return
    }

    window.close()
  })
}
</script>

<template>
  <div class="search-panel">
    <div class="search-panel__platform">
      <el-segmented v-model="selectedPlatform" :options="platformOptions" />
    </div>
    <div class="search-panel__input">
      <el-input
        v-model="keyword"
        placeholder="搜索剧集 / 系列..."
        clearable
        :disabled="searching"
        @keyup.enter="doSearch"
      >
        <template #suffix>
          <el-icon
            style="cursor: pointer"
            @click="doSearch"
          >
            <Search />
          </el-icon>
        </template>
      </el-input>
    </div>

    <div class="search-panel__results">
      <el-scrollbar>
        <div v-if="!searched && !searching && showPageCard" class="search-panel__list">
          <div class="search-item">
            <div class="search-item__info">
              <div class="search-item__title" :title="pageTab?.title">
                {{ pageTab?.title || '当前页面' }}
              </div>
              <div class="search-item__meta">
                <span class="search-item__tag" :class="`search-item__tag--${pagePlatform}`">
                  {{ platformLabel(pagePlatform) }}
                </span>
                <span class="search-item__sub">当前页面</span>
              </div>
            </div>
            <el-button
              size="small"
              type="primary"
              :loading="pageAdding"
              @click="handlePageAdd"
            >
              添加
            </el-button>
          </div>
        </div>

        <div v-if="!searched && !searching && !showPageCard" class="search-panel__empty">
          <el-icon size="40" color="#ccc">
            <Search />
          </el-icon>
          <span>请输入关键词搜索</span>
        </div>

        <div v-if="searching" class="search-panel__empty">
          <el-icon class="search-loading" size="24">
            <Loading />
          </el-icon>
          <span>搜索中...</span>
        </div>

        <div v-if="searched && !searching && errorMsg" class="search-panel__empty">
          <span>{{ errorMsg }}</span>
        </div>

        <div v-if="!searching && results.length > 0" class="search-panel__list">
          <div
            v-for="result in results"
            :key="getResultKey(result)"
            class="search-item"
          >
            <div class="search-item__cover">
              <img
                v-if="result.cover"
                :src="result.cover"
                alt=""
                referrerpolicy="no-referrer"
                @error="(e) => { (e.target as HTMLImageElement).style.display = 'none' }"
              >
            </div>
            <div class="search-item__info">
              <div class="search-item__title" :title="result.title">
                {{ result.title }}
              </div>
              <div class="search-item__meta">
                <span class="search-item__tag" :class="`search-item__tag--${result.platform}`">
                  {{ platformLabel(result.platform) }}
                </span>
                <span v-if="metaText(result)" class="search-item__sub">
                  {{ metaText(result) }}
                </span>
              </div>
            </div>
            <el-button
              size="small"
              type="primary"
              :loading="addingSet.has(getResultKey(result))"
              @click="addVideo(result)"
            >
              添加
            </el-button>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<style lang="scss">
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;

  &__platform {
    display: flex;
    justify-content: center;
  }

  &__input {
    flex-shrink: 0;
  }

  &__results {
    flex: 1;
    overflow: hidden;
    margin-right: -15px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px 15px;
    color: #999;
    font-size: 14px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-right: 15px;
  }
}

.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid rgba(#000, 8%);
  border-radius: 8px;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(#000, 15%);
  }

  &__cover {
    flex-shrink: 0;
    width: 48px;
    height: 64px;
    border-radius: 4px;
    overflow: hidden;
    background: #f0f0f0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    color: rgba(#000, 80%);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-all;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__sub {
    font-size: 11px;
    color: #999;
  }

  &__tag {
    display: inline-block;
    width: fit-content;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    color: #fff;

    &--2 {
      background: #fb7299;
    }

    &--1 {
      background: #12b7f5;
    }

    &--3 {
      background: #00be06;
    }
  }
}

.search-loading {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
