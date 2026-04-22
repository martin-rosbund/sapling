import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { useTranslationLoader } from '../generic/useTranslationLoader'
import { useSaplingMessageCenter } from './useSaplingMessageCenter'
import ApiGithubService from '@/services/api.github.service'
import type {
  CreateGithubIssuePayload,
  GithubIssue,
  GithubIssueStatus,
  GithubIssueType,
} from '@/services/api.github.service'

export type SaplingIssueStatus = Exclude<GithubIssueStatus, 'all'>
export type SaplingIssueType = GithubIssueType
export type SaplingIssue = GithubIssue
export type SaplingIssueDraft = CreateGithubIssuePayload

/**
 * Loads and exposes the full issue overview for the system dashboard.
 */
export function useSaplingIssue() {
  //#region State
  const openIssues = ref<SaplingIssue[]>([])
  const closedIssues = ref<SaplingIssue[]>([])
  const isIssueLoading = ref(true)
  const isCreateLoading = ref(false)
  const latestCreatedIssue = ref<SaplingIssue | null>(null)
  const draft = reactive<SaplingIssueDraft>({
    title: '',
    description: '',
    type: 'bug',
  })
  const { pushMessage } = useSaplingMessageCenter()
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'github', 'issue')
  const isLoading = computed(() => isTranslationLoading.value || isIssueLoading.value)
  const isCreateDisabled = computed(
    () => isCreateLoading.value || !draft.title.trim() || !draft.description.trim() || !draft.type,
  )
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    await fetchIssues()
  })
  //#endregion

  //#region Methods
  /**
   * Loads both issue buckets in parallel.
   */
  const fetchIssues = async () => {
    isIssueLoading.value = true

    try {
      const [open, closed] = await Promise.all([
        fetchIssuesByStatus('open'),
        fetchIssuesByStatus('closed'),
      ])

      openIssues.value = open
      closedIssues.value = closed
    } catch (error) {
      pushGithubError(error, 'global.readError', pushMessage)
    } finally {
      isIssueLoading.value = false
    }
  }

  /**
   * Resets the create-issue form to its defaults.
   */
  const resetDraft = () => {
    draft.title = ''
    draft.description = ''
    draft.type = 'bug'
  }

  /**
   * Creates a new GitHub issue and refreshes the dashboard afterwards.
   */
  const createIssue = async () => {
    if (isCreateDisabled.value) {
      return null
    }

    isCreateLoading.value = true

    try {
      const createdIssue = await ApiGithubService.createIssue({
        title: draft.title.trim(),
        description: draft.description.trim(),
        type: draft.type,
      })

      latestCreatedIssue.value = createdIssue
      resetDraft()
      pushMessage('success', 'issue.createSuccess', 'issue.createSuccessDescription', 'github')
      await fetchIssues()

      return createdIssue
    } catch (error) {
      pushGithubError(error, 'global.createError', pushMessage)
      return null
    } finally {
      isCreateLoading.value = false
    }
  }
  //#endregion

  //#region Return
  return {
    draft,
    openIssues,
    closedIssues,
    latestCreatedIssue,
    isCreateDisabled,
    isCreateLoading,
    isTranslationLoading,
    isLoading,
    createIssue,
    fetchIssues,
    resetDraft,
  }
  //#endregion
}

/**
 * Loads one dedicated issue bucket for focused consumers.
 */
export function useSaplingIssueStatus(status: SaplingIssueStatus) {
  //#region State
  const issues = ref<SaplingIssue[]>([])
  const isIssueLoading = ref(true)
  const { pushMessage } = useSaplingMessageCenter()
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'github', 'issue')
  const isLoading = computed(() => isTranslationLoading.value || isIssueLoading.value)
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    await fetchIssues()
  })
  //#endregion

  //#region Methods
  /**
   * Refreshes the issue list for the requested status.
   */
  async function fetchIssues() {
    isIssueLoading.value = true

    try {
      issues.value = await fetchIssuesByStatus(status)
    } catch (error) {
      pushGithubError(error, 'global.readError', pushMessage)
    } finally {
      isIssueLoading.value = false
    }
  }
  //#endregion

  //#region Return
  return {
    issues,
    isLoading,
    fetchIssues,
  }
  //#endregion
}

/**
 * Fetches all GitHub issues for one status bucket.
 */
async function fetchIssuesByStatus(status: SaplingIssueStatus) {
  return ApiGithubService.getIssues(status)
}

function pushGithubError(
  error: unknown,
  fallbackMessage: string,
  pushMessage: ReturnType<typeof useSaplingMessageCenter>['pushMessage'],
) {
  const { message, description } = extractApiError(error, fallbackMessage)
  pushMessage('error', message, description, 'github')
}

function extractApiError(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined

    const message = Array.isArray(responseData?.message)
      ? responseData?.message[0]
      : responseData?.message

    return {
      message: message || fallbackMessage,
      description: responseData?.error || '',
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      description: '',
    }
  }

  return {
    message: fallbackMessage,
    description: '',
  }
}
