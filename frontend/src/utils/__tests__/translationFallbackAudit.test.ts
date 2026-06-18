import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(testDirectory, '../..')

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8')
}

describe('translation fallback audit', () => {
  it('keeps the AI agent builder on direct translation keys without fallback arguments', () => {
    const source = readSource('views/AiAgentBuilderView.vue')

    expect(source).not.toContain('tr(')
    expect(source).not.toMatch(/\bt\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]/)
  })

  it('keeps dynamic label resolvers from showing guessed handles as labels', () => {
    const files = [
      'components/system/SaplingFormConfigAdmin.vue',
      'components/system/form-config/SaplingFormConfigPreviewPanel.vue',
      'components/dialog/fields/SaplingFieldTeamsRecipient.vue',
      'composables/reference/useSaplingGenericReferenceTarget.ts',
      'components/import/SaplingImportWorkspace.vue',
      'composables/system/useSaplingCommandPalette.ts',
      'composables/system/useSaplingNavigation.ts',
      'components/system/ai-chat/SaplingAiChatMessageList.vue',
    ]

    for (const file of files) {
      const source = readSource(file)
      expect(source, file).not.toMatch(/humanize(?:Handle|EntityHandle)\s*\(/)
      expect(source, file).not.toMatch(
        /\?\s*t\([^:\n]+:\s*(fieldName|entityHandle|template\.name|action\.status|route\.navigation|key|message)\b/,
      )
    }
  })

  it('uses skeletons instead of visible loading ellipses in the audited loading states', () => {
    const files = [
      'components/account/SaplingInstanceBooting.vue',
      'components/system/SaplingIssue.vue',
      'components/system/SaplingIssueList.vue',
      'components/system/SaplingSystem.vue',
    ]

    for (const file of files) {
      const source = readSource(file)
      expect(source, file).not.toMatch(/isLoading\s*\?\s*['"`]\.\.\.['"`]/)
      expect(source, file).not.toMatch(/return\s+['"`]\.\.\.['"`]/)
      expect(source, file).toContain('v-skeleton-loader')
    }
  })
})
