import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { KnowledgeArticleItem } from '@/entity/entity'
import ApiGenericService from '@/services/api.generic.service'

export function resolveRouteContextHelpKey(route: RouteLocationNormalizedLoaded): string | null {
  if (route.name === 'table' || route.name === 'partner' || route.name === 'file') {
    const entityHandle = route.params.entity
    return typeof entityHandle === 'string' && entityHandle.trim()
      ? `entity.${entityHandle.trim()}`
      : null
  }

  const routeContextKeys: Record<string, string> = {
    calendar: 'app.calendar',
    crmWorkspace: 'app.crmWorkspace',
    formConfig: 'app.formConfig',
    home: 'app.dashboard',
    issue: 'app.issue',
    knowledgeBase: 'app.knowledgeBase',
    note: 'app.notes',
    playground: 'app.playground',
    right: 'app.permissions',
    salesPipeline: 'app.salesPipeline',
    system: 'app.system',
  }

  return typeof route.name === 'string' ? (routeContextKeys[route.name] ?? null) : null
}

export async function openContextHelpArticle(
  router: Router,
  contextKey: string | null,
): Promise<boolean> {
  if (!contextKey) {
    return false
  }

  const article = await findContextHelpArticle(contextKey)
  if (!article) {
    return false
  }

  await router.push({
    name: 'knowledgeBase',
    query: { context: article.contextKey ?? contextKey },
  })
  return true
}

async function findContextHelpArticle(contextKey: string): Promise<KnowledgeArticleItem | null> {
  try {
    const response = await ApiGenericService.find<KnowledgeArticleItem>('knowledgeArticle', {
      filter: {
        $and: [{ isActive: true }, { status: { isPublished: true } }, { contextKey }],
      },
      limit: 1,
      relations: ['status'],
    })

    return response.data[0] ?? null
  } catch {
    return null
  }
}
