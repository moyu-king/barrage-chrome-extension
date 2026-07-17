import { MessageType } from '@/message-type'
import {
  createVideo,
  deleteVideo,
  getAllBarrages,
  getAllVideos,
  getEpisodes,
  getTencentEmojis,
  searchVideos,
  updateVideo,
} from '@/service'

export { MessageType }

// 请求拦截
const rules = [
  {
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'referer',
          operation: 'set',
          value: 'https://v.qq.com',
        },
        {
          header: 'origin',
          operation: 'set',
          value: 'https://v.qq.com',
        },
      ],
    },
    condition: {
      urlFilter: 'video.qq.com',
      resourceTypes: ['xmlhttprequest'],
    },
  },
  {
    id: 2,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'referer',
          operation: 'set',
          value: 'https://www.bilibili.com',
        },
      ],
    },
    condition: {
      urlFilter: 'bilibili.com',
      resourceTypes: ['xmlhttprequest'],
    },
  },
  {
    id: 3,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'referer',
          operation: 'set',
          value: 'https://www.iqiyi.com',
        },
        {
          header: 'origin',
          operation: 'set',
          value: 'https://www.iqiyi.com',
        },
      ],
    },
    condition: {
      urlFilter: 'iqiyi.com',
      resourceTypes: ['xmlhttprequest'],
    },
  },
] as Array<chrome.declarativeNetRequest.Rule>

chrome.runtime.onInstalled?.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3],
    addRules: rules,
  })
})

// addListener回调函数建议不加async，会改变sendResponse的执行时机
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  switch (message.type) {
    case MessageType.GET_VIDEOS: {
      getAllVideos().then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.GET_BARRAGES: {
      const { params } = message
      if (!params) {
        sendResponse({ data: [] })
      }
      else {
        getAllBarrages(params).then((response) => {
          sendResponse(response)
        })
      }
      break
    }
    case MessageType.GET_EPISODES: {
      const { id } = message
      if (!id) {
        sendResponse({ data: [] })
      }
      else {
        getEpisodes(id).then((response) => {
          sendResponse(response)
        })
      }
      break
    }
    case MessageType.CREATE_VIDEO: {
      const { data } = message
      createVideo(data).then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.GET_VIDEO_EMOJI: {
      const { id } = message
      getTencentEmojis(id).then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.DELETE_VIDEO: {
      const { id } = message
      deleteVideo(id).then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.UPDATE_VIDEO: {
      const { data, id } = message
      updateVideo(id, data).then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.SEARCH_VIDEO: {
      const { platform, keyword, page } = message
      searchVideos(platform, keyword, page).then((response) => {
        sendResponse(response)
      })
      break
    }
    case MessageType.SYNC_CONTENT_DATA: {
      const payload = { type: MessageType.SYNC_CONTENT_DATA, video: message.video }
      chrome.tabs.query({ status: 'complete' }, (tabs) => {
        tabs.forEach((tab) => {
          if (!tab.id || !tab.url || !/^https?:/i.test(tab.url))
            return
          chrome.tabs.sendMessage(tab.id, payload, () => {
            // 部分标签页未注入 content script，忽略错误
            void chrome.runtime.lastError
          })
        })
      })
      break
    }
  }

  return true // 异步调用sendResponse
})
