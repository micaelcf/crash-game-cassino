import { Global, Module } from '@nestjs/common'
import { PrometheusModule } from '@willsoto/nestjs-prometheus'
import { GameMetrics } from './game-metrics'

@Global()
@Module({
	imports: [
		PrometheusModule.register({
			path: '/metrics',
			defaultMetrics: { enabled: true },
		}),
	],
	providers: [{ provide: GameMetrics, useFactory: () => new GameMetrics() }],
	exports: [GameMetrics],
})
export class ObservabilityModule {}
