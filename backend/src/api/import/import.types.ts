export type ImportFieldMappingDto = {
  sourceColumn: string;
  targetField: string;
};

export type ImportRelationMappingMode = 'handle' | 'value' | 'externalKey';

export type ImportRelationMappingDto = {
  targetField: string;
  mode: ImportRelationMappingMode;
  sourceColumn?: string;
  sourceColumns?: string[];
  sourceHandle?: string | null;
};

export type ImportGenericReferenceMappingDto = {
  entityHandle: string;
  sourceHandle?: string | null;
  keyColumns: string[];
};

export type ImportValueMappingFallback = 'keep' | 'empty' | 'error';

export type ImportValueMappingDto = {
  targetField: string;
  values: Record<string, unknown>;
  fallback?: ImportValueMappingFallback;
};

export type ImportAiSuggestDto = {
  entityHandle?: string | null;
  sourceHandle?: string | null;
  providerHandle?: string | null;
  modelHandle?: string | null;
  maxSampleRows?: number | null;
};

export type ImportAiSuggestionConfidence = number;

export type ImportAiSuggestedFieldMappingDto = ImportFieldMappingDto & {
  confidence: ImportAiSuggestionConfidence;
  reason?: string | null;
};

export type ImportAiSuggestedExternalKeyDto = {
  columns: string[];
  confidence: ImportAiSuggestionConfidence;
  reason?: string | null;
};

export type ImportAiSuggestedReferenceFieldDto = {
  targetField: string;
  referenceName: string;
  sourceColumn?: string | null;
  confidence: ImportAiSuggestionConfidence;
  reason?: string | null;
};

export type ImportAiSuggestedValueMappingDto = ImportValueMappingDto & {
  confidence: ImportAiSuggestionConfidence;
  reason?: string | null;
};

export type ImportAiSuggestionDto = {
  mappings: ImportAiSuggestedFieldMappingDto[];
  externalKey: ImportAiSuggestedExternalKeyDto | null;
  referenceFields: ImportAiSuggestedReferenceFieldDto[];
  valueMappings: ImportAiSuggestedValueMappingDto[];
  warnings: string[];
  providerHandle?: string | null;
  modelHandle?: string | null;
};

export type ConfigureImportBatchDto = {
  entityHandle: string;
  sourceHandle?: string | null;
  templateHandle?: number | null;
  keyColumns?: string[];
  mappings?: ImportFieldMappingDto[];
  relationMappings?: ImportRelationMappingDto[];
  valueMappings?: ImportValueMappingDto[];
  genericReferenceMapping?: ImportGenericReferenceMappingDto | null;
};

export type SaveImportTemplateDto = ConfigureImportBatchDto & {
  handle?: number | null;
  title: string;
  description?: string | null;
  isActive?: boolean;
};

export type ImportTemplateSummaryDto = {
  handle: number | null;
  title: string;
  description: string | null;
  sourceHandle: string;
  entityHandle: string;
  isActive: boolean;
  mapping: object;
  externalKeyColumns: string[] | null;
  genericReferenceMapping: object | null;
};

export type ImportBatchRowSummaryDto = {
  handle: number | null;
  rowNumber: number;
  status: string;
  action: string | null;
  targetReference: string | null;
  externalKeyHash: string | null;
  externalKeyParts: Record<string, unknown> | null;
  rawData: Record<string, unknown>;
  payload: Record<string, unknown> | null;
  message: string | null;
};

export type ImportBatchSummaryDto = {
  handle: number | null;
  status: string;
  filename: string;
  mimetype?: string | null;
  fileSize?: number | null;
  sourceHandle?: string | null;
  entityHandle?: string | null;
  templateHandle?: number | null;
  rowCount: number;
  readyCount: number;
  errorCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  delimiter?: string | null;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  mapping?: object | null;
  externalKeyColumns?: string[] | null;
  genericReferenceMapping?: object | null;
  executedAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  rows: ImportBatchRowSummaryDto[];
};
