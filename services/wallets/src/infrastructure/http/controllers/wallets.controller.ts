import { GetWalletQuery } from '@application/wallet/dtos/get-wallet.query'
import { toWalletDto, WalletDto } from '@application/wallet/dtos/wallet.dto'
import { Wallet } from '@domain/wallet/wallet.entity'
import type { AuthenticatedRequest } from '@infrastructure/auth/auth-user'
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard'
import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import {
	ApiBearerAuth,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from '@nestjs/swagger'

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WalletsController {
	constructor(private readonly queryBus: QueryBus) {}

	@Get('me')
	@ApiOperation({
		summary:
			'Return the authenticated player wallet (auto-provisioned on first read).',
	})
	@ApiOkResponse({ description: 'Wallet found or freshly created.', type: WalletDto })
	async getMyWallet(@Req() req: AuthenticatedRequest): Promise<WalletDto> {
		const wallet: Wallet = await this.queryBus.execute(
			new GetWalletQuery(req.user.sub),
		)
		return toWalletDto(wallet)
	}
}
