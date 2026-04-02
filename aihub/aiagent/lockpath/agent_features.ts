export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canPerformRiskAnalysis: boolean
  canTrackWalletActivity: boolean
  canProvideMarketSignals: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  allowBackgroundProcessing: boolean
  enforceStrictSchema: boolean
}

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = {
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canPerformRiskAnalysis: true,
  canTrackWalletActivity: true,
  canProvideMarketSignals: true,
}

export const SOLANA_AGENT_FLAGS: AgentFlags = {
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
  allowBackgroundProcessing: false,
  enforceStrictSchema: true,
}

/**
 * Utility function to check if agent supports a specific capability
 */
export function hasCapability(
  agent: AgentCapabilities,
  capability: keyof AgentCapabilities
): boolean {
  return agent[capability] === true
}

/**
 * Utility function to toggle agent flags dynamically
 */
export function updateAgentFlags(
  currentFlags: AgentFlags,
  updates: Partial<AgentFlags>
): AgentFlags {
  return { ...currentFlags, ...updates }
}
