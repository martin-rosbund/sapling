export type SaplingMcpCriteriaMode = 'filter' | 'orderBy';

export type SaplingMcpInvalidCriteriaField = {
  entityHandle: string;
  fieldPath: string;
  fieldName: string;
  mode: SaplingMcpCriteriaMode;
  reason: 'unknownField' | 'invalidRelationPath';
};

export class SaplingMcpCriteriaRepairRequest extends Error {
  constructor(readonly invalidFields: SaplingMcpInvalidCriteriaField[]) {
    super('ai.mcpCriteriaNeedsSchemaRetry');
  }
}
