import { Controller, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto'; // DTO는 나중에 생성

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(req.user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(@Request() req) {
    await this.userService.delete(req.user.id);
    return { message: 'Account deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId/room/:roomId/points')
  async getUserPoints(
    @Param('userId') userId: number,
    @Param('roomId') roomId: string,
  ) {
    return this.userService.getUserPointsInRoom(userId, roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':userId/room/:roomId/points')
  async updateUserPoints(
    @Param('userId') userId: number,
    @Param('roomId') roomId: string,
    @Body('points') points: number,
  ) {
    return this.userService.updateUserPointsInRoom(userId, roomId, points);
  }
}