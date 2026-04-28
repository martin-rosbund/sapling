import { BACKEND_URL } from '@/constants/project.constants'
import axios from 'axios'
import { pushApiErrorMessage } from '@/services/api.error.service'

export type GithubIssueStatus = 'open' | 'closed' | 'all'
export type GithubIssueType = 'bug' | 'feature'

export interface GithubIssueAssignee {
  login: string
  avatar_url: string
  html_url: string
}

export interface GithubIssueLabel {
  name: string
  color: string
}

export interface GithubIssue {
  id: number
  number: number
  title: string
  html_url: string
  body: string
  updated_at: string
  created_at: string
  assignees: GithubIssueAssignee[]
  state: string
  labels: GithubIssueLabel[]
}

export interface CreateGithubIssuePayload {
  title: string
  description: string
  type: GithubIssueType
}

class ApiGithubService {
  static async getIssues(status: GithubIssueStatus): Promise<GithubIssue[]> {
    try {
      const response = await axios.get<GithubIssue[]>(`${BACKEND_URL}github/issues`, {
        params: { status },
      })

      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', 'github')
      throw error
    }
  }

  static async createIssue(payload: CreateGithubIssuePayload): Promise<GithubIssue> {
    try {
      const response = await axios.post<GithubIssue>(`${BACKEND_URL}github/issues`, payload)

      return response.data
    } catch (error) {
      pushApiErrorMessage(error, 'exception.unknownError', 'github')
      throw error
    }
  }
}

export default ApiGithubService
