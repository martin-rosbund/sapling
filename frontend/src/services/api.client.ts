import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { applyClientFormattingHeaders } from '@/services/clientFormattingContext'

let clientFormattingInterceptorRegistered = false

export function buildApiUrl(path: string): string {
  return `${BACKEND_URL}${path.replace(/^\/+/, '')}`
}

export function configureApiClient(): void {
  axios.defaults.baseURL = BACKEND_URL
  axios.defaults.withCredentials = true

  if (!clientFormattingInterceptorRegistered) {
    axios.interceptors.request.use((config) => applyClientFormattingHeaders(config))
    clientFormattingInterceptorRegistered = true
  }
}
