import {
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
  GET_EPISODES,
  GET_BARRAGES,
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: rules,
  })

  // addListener 不要加async，会改变sendResponse的执行时机
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    switch (message.type) {
      case MessageType.GET_VIDEOS: {
        getAllVideos().then(({ data }) => {
          sendResponse(data)
        })
        break
      }
      case MessageType.GET_BARRAGES: {
        const { params } = message
        if (!params) {
          sendResponse([])
        }
        else {
          getAllBarrages(params).then(({ data }) => {
            sendResponse(data)
          })
        }
        break
      }
      case MessageType.GET_EPISODES: {
        const { id } = message
        if (!id) {
          sendResponse([])
        }
        else {
          getEpisodes(id).then(({ data }) => {
            sendResponse(data)
          })
        }
        break
      }
    }

    return true
  })
})
