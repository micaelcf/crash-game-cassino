import { Global, Module } from '@nestjs/common';
import { ProvablyFairService } from './round/provably-fair.service';
import { CLOCK, SystemClock } from './shared/clock';

@Global()
@Module({
  providers: [ProvablyFairService, { provide: CLOCK, useClass: SystemClock }],
  exports: [ProvablyFairService, CLOCK],
})
export class DomainModule {}
