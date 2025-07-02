fetch('https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2&vversion_name=8.2.96', {
  method: 'POST',
  body: JSON.stringify({
    page_params: {
      req_from: 'web_vsite',
      page_id: 'vsite_episode_list',
      page_type: 'detail_operation',
      id_type: '1',
      page_size: '',
      cid: 'mzc00200z195unq',
      vid: 'i4101vrl7tu',
      lid: '',
      page_num: '',
      page_context: '',
      detail_page_type: '1',
    },
    has_cache: 1,
  }),
})
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  })
  .then((data) => {
    console.log('响应数据', data)
  })

fetch('https://api.bilibili.com/pgc/view/web/season?ep_id=1633640', {
  method: 'GET',
}).then((response) => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}).then((data) => {
  console.log('响应数据', data)
})
