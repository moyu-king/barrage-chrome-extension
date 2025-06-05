import axios from 'axios'

export const instance = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : 'http://127.0.0.1:8000'
})

instance.interceptors.response.use(
  response => {
    return Promise.resolve(response.data)
  },
  error => {
    return Promise.reject(error)
  }
)