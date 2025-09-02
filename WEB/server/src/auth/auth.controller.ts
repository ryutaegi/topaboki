import { Controller, Get, UseGuards, Req, Res, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // JwtAuthGuard 임포트
import { User } from '../user/user.entity'; // User 엔티티 임포트

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(ValidationPipe)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User; // req.user를 User 타입으로 명시적 캐스팅
    const jwt = await this.authService.login(user);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let redirectUrl = `${clientUrl}/auth/callback?token=${jwt.access_token}`;

    // isRegistrationComplete 상태에 따라 리다이렉션 URL 변경
    if (user && !user.isRegistrationComplete) { // user가 undefined가 아님을 확인
      redirectUrl = `${clientUrl}/complete-google-registration?token=${jwt.access_token}`;
    }

    res.redirect(redirectUrl);
  }

  @Post('google/complete-registration')
  @UseGuards(JwtAuthGuard) // JWT를 통해 사용자 인증
  @HttpCode(HttpStatus.OK)
  @UsePipes(ValidationPipe)
  async completeGoogleRegistration(
    @Req() req: Request & { user: { id: number } },
    @Body() dto: CompleteGoogleRegistrationDto,
  ) {
    const updatedUser = await this.authService.completeGoogleRegistration(req.user.id, dto);
    const jwt = await this.authService.login(updatedUser); // 업데이트된 정보로 새 JWT 발급
    return { access_token: jwt.access_token };
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    // 클라이언트 측에서 JWT 토큰을 삭제하도록 지시
    res.status(200).send({ message: 'Logged out successfully' });
  }
}
