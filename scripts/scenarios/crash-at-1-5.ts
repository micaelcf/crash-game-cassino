import type { Scenario } from './crash-seeds.types'

export const crashAt1_5: Scenario = {
	name: 'crash-at-1.5',
	description:
		'Single round that crashes at exactly 1.5x. One player loses, one cashes out at 1.4x.',
	players: [
		{
			userId: 'seed-player-loser',
			username: 'loser',
			startingBalanceCents: 100_000n,
		},
		{
			userId: 'seed-player-winner',
			username: 'winner',
			startingBalanceCents: 100_000n,
		},
	],
	rounds: [
		{
			targetHundredths: 150,
			bets: [
				{ userId: 'seed-player-loser', username: 'loser', amountCents: 1_000n },
				{
					userId: 'seed-player-winner',
					username: 'winner',
					amountCents: 1_000n,
					cashout: { atHundredths: 140 },
				},
			],
		},
	],
}
