import type { BaseResponse } from './base'

import { getDB, instance } from './base'

export interface EmojiInfo {
  code: string
  url: string
}

/**
 * 获取腾讯视频的弹幕emoji
 */
export async function getTencentEmojis(vid: number) {
  const response = {
    status: 1,
    message: 'ok',
    data: [],
  } as BaseResponse<EmojiInfo[]>

  try {
    const db = await getDB()
    const video = await db.get('videos', vid)

    if (!video || !video.params?.cid || !video.params?.vid)
      throw new Error('无效视频id')

    const data = (await instance.post(
      'https://pbaccess.video.qq.com/trpc.message.danmu_richdata.Richdata/GetRichData',
      {
        danmu_key: `cid=${video.params.cid}&vid=${video.params.vid}`,
        vip_degree: 4,
      },
    )) as Record<string, any>
    response.data = data.data.emoji_configs.emoji_infos?.map((item: any) => ({ code: item.emoji_code, url: item.emoji_url }))
  }
  catch (e) {
    response.status = 0
    response.message = (e as Error).message
  }

  return response
}
