import type { Scenario } from './crash-seeds.types'

export const bigWin: Scenario = {
	name: 'big-win',
	description:
		'Round crashes at 100x; one player cashes out at 50x for a leaderboard-worthy payout.',
	players: [
		{
			userId: 'seed-player-whale',
			username: 'whale',
			startingBalanceCents: 1_000_000n,
		},
	],
	rounds: [
		{
			targetHundredths: 10_000,
			bets: [
				{
					userId: 'seed-player-whale',
					username: 'whale',
					amountCents: 10_000n,
					cashout: { atHundredths: 5_000 },
				},
			],
		},
	],
}
