import axios from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'

export function buildApiUrl(path: string): string {
  return `${BACKEND_URL}${path.replace(/^\/+/, '')}`
}

export function configureApiClient(): void {
  axios.defaults.baseURL = BACKEND_URL
  axios.defaults.withCredentials = true
}
