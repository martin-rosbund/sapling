export type McpToolPolicy = {
  allowedEntityHandles?: string[];
  allowedKnowledgeEntityHandles?: string[];
  allowedInternalTools?: string[];
  allowedExternalTools?: string[];
  blockMutatingTools?: boolean;
};
