import { instance } from './base'

export interface Barrage {
  time_offset: number,
  content: string,
}

export async function getAllBarrages(): Promise<Barrage[]> {
  const data = await instance.post('/tencent/barrage?duration=30') as { data: { barrages: Barrage[] } }[]

  return data.flatMap(item => item.data.barrages)
}