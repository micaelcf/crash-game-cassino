import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module, ValidationPipe } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import mikroOrmConfig from './infrastructure/db/mikro-orm.config'
import { InfrastructureModule } from './infrastructure/infrastructure.module'

@Module({
	imports: [
		MikroOrmModule.forRoot({ ...mikroOrmConfig, autoLoadEntities: true }),
		InfrastructureModule,
	],
	providers: [
		{
			provide: APP_PIPE,
			useFactory: () =>
				new ValidationPipe({ whitelist: true, transform: true }),
		},
	],
})
export class AppModule {}
