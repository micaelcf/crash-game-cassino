import type { LeaderboardWindow } from '@application/leaderboard/dtos/leaderboard.dto'

export class GetLeaderboardQuery {
	constructor(
		public readonly window: LeaderboardWindow,
		public readonly limit: number = 20,
	) {}
}
