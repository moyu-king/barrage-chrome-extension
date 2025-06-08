import axios from 'axios'

export const instance = axios.create({
  baseURL: import.meta.env.DEV ? 'http://127.0.0.1:5173/api' : 'http://127.0.0.1:8000'
})

export interface BaseResponse<T extends Record<string, any> | Array<Record<string, any>>> {
  status: 0 | 1,
  message: string,
  data: T
}

instance.interceptors.response.use(
  response => {
    return Promise.resolve(response.data)
  },
  error => {
    return Promise.reject(error)
  }
)