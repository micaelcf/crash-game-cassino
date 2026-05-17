export const qk = {
	wallet: {
		me: () => ["wallet", "me"] as const,
	},
	rounds: {
		current: () => ["rounds", "current"] as const,
		history: (page: number, pageSize: number) =>
			["rounds", "history", { page, pageSize }] as const,
		verify: (roundId: string) => ["rounds", "verify", roundId] as const,
	},
	bets: {
		me: (page: number, pageSize: number) =>
			["bets", "me", { page, pageSize }] as const,
	},
} as const;
