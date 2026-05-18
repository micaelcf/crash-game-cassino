import { Global, Module } from '@nestjs/common'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { WalletMetrics } from './wallet-metrics'

@Global()
@Module({
	imports: [
		PrometheusModule.register({
			path: '/metrics',
			defaultMetrics: { enabled: true },
		}),
	],
	providers: [
		{ provide: WalletMetrics, useFactory: () => new WalletMetrics() },
	],
	exports: [WalletMetrics],
})
export class ObservabilityModule {}
