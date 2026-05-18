import { HealthCheckResponseDto } from '@infrastructure/http/dtos/health-check-response.dto'
import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('health')
@Controller('health')
export class HealthController {
	@Get()
	@ApiOkResponse({
		description: 'Service is up.',
		type: HealthCheckResponseDto,
	})
	check(): HealthCheckResponseDto {
		return { status: 'ok', service: 'wallets' }
	}
}
