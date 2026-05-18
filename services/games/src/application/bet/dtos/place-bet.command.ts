export class PlaceBetCommand {
	constructor(
		public readonly userId: string,
		public readonly username: string,
		public readonly amountCents: bigint,
	) {}
}
