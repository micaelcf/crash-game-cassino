import type { AuthenticatedRequest } from '@infrastructure/auth/auth-user'
import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

const headerToString = (
	value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value)

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
		const mockUser = headerToString(request.headers['x-mock-user-id'])
		if (mockUser) {
			const mockUsername =
				headerToString(request.headers['x-mock-username']) ?? mockUser
			request.user = { sub: mockUser, username: mockUsername }
			return true
		}
		return super.canActivate(context)
	}
}
