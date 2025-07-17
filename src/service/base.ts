import type { DBSchema, IDBPDatabase } from 'idb'

import axios from 'axios'
import { openDB } from 'idb'

export const instance = axios.create()

export interface BaseResponse<T extends Record<string, any> | Array<Record<string, any>> | null> {
  status: 0 | 1
  message: string
  data: T
}

instance.interceptors.response.use(
  (response) => {
    return Promise.resolve(response.data)
  },
  (error) => {
    return Promise.reject(error)
  },
)

/* ==================== indexDB ==================== */
export enum Platform {
  TENCENT = 1,
  BILIBILI,
}

export interface Video {
  id?: number
  name: string
  platform: Platform
  params: Record<string, any>
}

export interface IDB extends DBSchema {
  videos: {
    key: number
    value: Video
  }
}

let idb: Promise<IDBPDatabase<IDB>> | null = null

export function getDB() {
  if (!idb) {
    idb = openDB<IDB>(
      'barrage_database',
      1,
      {
        upgrade(db) {
          if (!db.objectStoreNames.contains('videos')) {
            db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true })
          }
        },
      },
    )
  }

  return idb
}
