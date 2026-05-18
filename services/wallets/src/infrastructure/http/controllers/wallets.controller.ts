import { CreateWalletCommand } from '@application/wallet/dtos/create-wallet.command'
import { GetWalletQuery } from '@application/wallet/dtos/get-wallet.query'
import { toWalletDto, WalletDto } from '@application/wallet/dtos/wallet.dto'
import { Wallet } from '@domain/wallet/wallet.entity'
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard'
import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WalletsController {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
	) {}

	@Post()
	@ApiOperation({ summary: 'Create a wallet for the authenticated player.' })
	@ApiCreatedResponse({ description: 'Wallet created.', type: WalletDto })
	async createWallet(@Req() req: any): Promise<WalletDto> {
		const wallet: Wallet = await this.commandBus.execute(
			new CreateWalletCommand(req.user.sub),
		)
		return toWalletDto(wallet)
	}

	@Get('me')
	@ApiOperation({ summary: 'Return the authenticated player wallet.' })
	@ApiOkResponse({ description: 'Wallet found.', type: WalletDto })
	async getMyWallet(@Req() req: any): Promise<WalletDto> {
		const wallet: Wallet = await this.queryBus.execute(
			new GetWalletQuery(req.user.sub),
		)
		return toWalletDto(wallet)
	}
}
