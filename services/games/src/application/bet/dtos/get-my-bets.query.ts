export class GetMyBetsQuery {
	constructor(
		public readonly userId: string,
		public readonly page: number = 1,
		public readonly pageSize: number = 20,
	) {}
}
