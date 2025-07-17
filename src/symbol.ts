import type  { InjectionKey } from 'vue'
import type { Video, Episode, Platform } from '@/service'

export interface ContentInjection {
  videos: Ref<Video[]>
  selectedVideoId: Ref<number | undefined>
  episodesMap: Ref<Map<number, Episode[]>>
  videoMap: ComputedRef<Map<Video['id'], Video>>
  selectedEpisode: Ref<Episode | null>,
  videoGroup: ComputedRef<Record<Platform, Video[]>>
}
export const contentInjectionKey: InjectionKey<ContentInjection> = Symbol('contentInjectionKey')