import type { InjectionKey } from 'vue'
import type { Barrage, EmojiInfo, Episode, Platform, Video } from '@/service'

export interface ContentInjection {
  dialogEl: Ref<HTMLElement | undefined>
  barragesMap: Ref<Map<string, Barrage[]>>
  videos: Ref<Video[]>
  selectedVideoId: Ref<number | undefined>
  selectedVId: Ref<string>
  episodesMap: Ref<Map<number, Episode[]>>
  videoMap: ComputedRef<Map<Video['id'], Video>>
  selectedEpisode: Ref<Episode | null>
  isCustomPlay: Ref<boolean>
  videoGroup: ComputedRef<Record<Platform, Video[]>>
  emojiMap: Ref<Map<Video['id'], EmojiInfo[]>>
}
export const contentInjectionKey: InjectionKey<ContentInjection> = Symbol('contentInjectionKey')
