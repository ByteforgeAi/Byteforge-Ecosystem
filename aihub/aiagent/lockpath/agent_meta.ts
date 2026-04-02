export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

export const SOLANA_KNOWLEDGE_AGENT_VERSION = "1.0.0" as const

export const SOLANA_KNOWLEDGE_AGENT_DESCRIPTION =
  "Agent responsible for answering Solana-related questions with authoritative knowledge" as const

export const SOLANA_KNOWLEDGE_AGENT_TAGS = [
  "solana",
  "knowledge",
  "protocol",
  "ecosystem",
  "agent",
] as const

/**
 * Utility to build a fully qualified agent reference
 */
export function buildSolanaKnowledgeAgentRef(): string {
  return `${SOLANA_KNOWLEDGE_AGENT_ID}@${SOLANA_KNOWLEDGE_AGENT_VERSION}`
}
