import type { LeaderboardWindow } from '@crash/contracts'

export class GetLeaderboardQuery {
	constructor(
		public readonly window: LeaderboardWindow,
		public readonly limit: number = 20,
	) {}
}
