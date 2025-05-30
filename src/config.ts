// 也可搭建后端服务爬取数据
export const videoConfig = [
  {
    referer: '腾讯视频',
    list: [
      { name: '完美世界', vid: 'x0036x5qqsr', cid: 'mcv8hkc8zk8lnov' }
    ]
  }
]

/**
  腾讯视频
  1. 获取指定id的集数列表

  POST https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2&vversion_name=8.2.96

  requestBody: {
    "page_params": {
        "req_from": "web_vsite",
        "page_id": "vsite_episode_list",
        "page_type": "detail_operation",
        "id_type": "1",
        "cid": "mcv8hkc8zk8lnov",
        "vid": "x0036x5qqsr",
        "detail_page_type": "1",
        "page_context": ""
    },
    "has_cache": 1
  }

  response: 其中module_list_datas.module_datas[0].tabs为集数分页标签，如果分页请求需要传参对应的page_context,其余不变
 */