import type { InjectionKey } from 'vue'
import type { Barrage, Episode, Platform, Video } from '@/service'

export interface ContentInjection {
  barragesMap: Ref<Map<string, Barrage[]>>
  videos: Ref<Video[]>
  selectedVideoId: Ref<number | undefined>
  selectedVId: Ref<string>
  episodesMap: Ref<Map<number, Episode[]>>
  videoMap: ComputedRef<Map<Video['id'], Video>>
  selectedEpisode: Ref<Episode | null>
  isCustomPlay: Ref<boolean>
  videoGroup: ComputedRef<Record<Platform, Video[]>>
}
export const contentInjectionKey: InjectionKey<ContentInjection> = Symbol('contentInjectionKey')
