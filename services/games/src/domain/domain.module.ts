import { ProvablyFairService } from '@domain/round/provably-fair.service'
import { CLOCK, SystemClock } from '@domain/shared/clock'
import { Global, Module } from '@nestjs/common'

@Global()
@Module({
	providers: [ProvablyFairService, { provide: CLOCK, useClass: SystemClock }],
	exports: [ProvablyFairService, CLOCK],
})
export class DomainModule {}
