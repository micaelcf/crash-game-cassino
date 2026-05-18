import mikroOrmConfig from '@infrastructure/db/mikro-orm.config'
import { InfrastructureModule } from '@infrastructure/infrastructure.module'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_PIPE } from '@nestjs/core'

@Module({
	imports: [
		ConfigModule.forRoot(),
		MikroOrmModule.forRoot(mikroOrmConfig),
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
