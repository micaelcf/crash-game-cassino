export interface RoundOrchestratorConfig {
	bettingPhaseMs: number
	interRoundGapMs: number
	growthRate: number
	clientSeed: string
}

export const ROUND_ORCHESTRATOR_CONFIG = Symbol('ROUND_ORCHESTRATOR_CONFIG')
