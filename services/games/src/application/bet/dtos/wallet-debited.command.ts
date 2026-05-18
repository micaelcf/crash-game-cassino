export class WalletDebitedCommand {
	constructor(
		public readonly messageId: string,
		public readonly betId: string,
	) {}
}
