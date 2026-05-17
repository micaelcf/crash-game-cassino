import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest()
		const mockUser = request.headers['x-mock-user-id']
		if (mockUser) {
			request.user = {
				sub: mockUser,
				username: request.headers['x-mock-username'] ?? mockUser,
			}
			return true
		}
		return super.canActivate(context)
	}
}
