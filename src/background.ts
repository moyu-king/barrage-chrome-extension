import {
  createVideo,
  getAllBarrages,
  getAllVideos,
  getEpisodes,
} from '@/service'

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
] as Array<chrome.declarativeNetRequest.Rule>

export enum MessageType {
  GET_VIDEOS,
  CREATE_VIDEO,
  GET_EPISODES,
  GET_BARRAGES,
}

chrome.runtime.onInstalled?.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: rules,
  })

  // createVideo({ name: '斗破苍穹', params: { vid: 'q0043cz9x20', cid: 'mzc0020027yzd9e' }, platform: 1 })
  // createVideo({ name: '凡人修仙传', params: { season_id: '28747' }, platform: 2 })
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
    }
  }

  return true // 异步调用sendResponse
})
