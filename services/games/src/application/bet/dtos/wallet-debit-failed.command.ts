export class WalletDebitFailedCommand {
  constructor(
    public readonly messageId: string,
    public readonly betId: string,
    public readonly reason: string,
  ) {}
}
