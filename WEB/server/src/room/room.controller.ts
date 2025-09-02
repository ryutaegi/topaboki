import { Controller, Post, Body, UseGuards, ConflictException, Get, Request, Param, NotFoundException, ParseIntPipe, Put, UseInterceptors, UploadedFiles, BadRequestException, Delete, UnauthorizedException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../user/user.entity';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UploadClassificationImagesDto } from './dto/upload-classification-images.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises'; // fs/promises 임포트

@Controller('room')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly httpService: HttpService, // HttpService 주입
    private readonly configService: ConfigService, // ConfigService 주입
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Request() req) {
    const existingRoom = await this.roomService.findRoomByName(createRoomDto.name);
    if (existingRoom) {
      throw new ConflictException('이미 존재하는 룸 이름입니다.');
    }
    const creator: User = req.user;
    return this.roomService.createRoom(createRoomDto, creator);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-rooms')
  async getMyRooms(@Request() req) {
    const user: User = req.user;
    if (user.role !== 'admin') {
      throw new NotFoundException('관리자만 접근할 수 있습니다.');
    }
    return this.roomService.getRoomsByCreator(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/users')
  async getUsersInRoom(@Param('id', ParseIntPipe) roomId: number, @Request() req) {
    const user: User = req.user;
    if (user.role !== 'admin') {
      throw new NotFoundException('관리자만 접근할 수 있습니다.');
    }
    const room = await this.roomService.findRoomById(roomId);
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }
    return this.roomService.getUsersInRoom(roomId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllRooms() {
    return this.roomService.findAllRooms();
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async joinRoom(@Param('id', ParseIntPipe) roomId: number, @Body() joinRoomDto: JoinRoomDto, @Request() req) {
    const user: User = req.user;
    return this.roomService.joinRoom(roomId, joinRoomDto.password, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('joined-rooms')
  async getJoinedRooms(@Request() req) {
    const user: User = req.user;
    return this.roomService.getJoinedRoomsByUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id') // 특정 룸 상세 정보와 사용자 목록 가져오기
  async getRoomWithUsers(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomService.getRoomWithUsers(id);
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-image')
  @UseInterceptors(FilesInterceptor('images', 10, { // 10개까지 파일 허용
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const room = await this.roomService.findRoomById(id);
    if (!room || room.creator.id !== req.user.id) {
      throw new NotFoundException('룸을 찾을 수 없거나 이미지 업로드 권한이 없습니다.');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지 파일이 없습니다.');
    }
    const imageUrls = files.map(file => `/uploads/${file.filename}`);
    return { imageUrls }; // imageUrls 배열 반환
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/settings')
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async updateRoomSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const room = await this.roomService.findRoomById(id);
    if (!room || room.creator.id !== req.user.id) {
      throw new NotFoundException('룸을 찾을 수 없거나 수정 권한이 없습니다.');
    }
    // Note: Assuming updateRoomDto.steps already contains the correct image URLs, 
    // potentially from client-side uploads or existing data.
    // The 'files' parameter might still be used for new uploads, but its processing
    // logic would need to be integrated with how 'steps' are constructed on the client.
    // For now, we'll pass the updateRoomDto directly to the service.
    return this.roomService.updateRoomSettings(id, updateRoomDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-classification-images')
  @UseInterceptors(FilesInterceptor('images', 100, {
    storage: diskStorage({
      destination: './uploads/classification_images',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadClassificationImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('type') type: 'normal' | 'abnormal',
    @Request() req,
  ) {
    const room = await this.roomService.findRoomById(id);
    if (!room || room.creator.id !== req.user.id) {
      throw new NotFoundException('룸을 찾을 수 없거나 이미지 업로드 권한이 없습니다.');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지 파일이 없습니다.');
    }

    const imageUrls = files.map(file => `/uploads/classification_images/${file.filename}`);
    console.log(`Uploaded images: ${imageUrls.join(', ')}`);

    if (type === 'normal') {
      await this.roomService.updateRoomClassificationImages(id, [...(room.normalImages || []), ...imageUrls], room.abnormalImages || []);
    } else if (type === 'abnormal') {
      await this.roomService.updateRoomClassificationImages(id, room.normalImages || [], [...(room.abnormalImages || []), ...imageUrls]);
    } else {
      throw new BadRequestException('유효하지 않은 이미지 타입입니다. (normal 또는 abnormal)');
    }
    console.log('Returned Image URLs from NestJS:', imageUrls);
    return { message: '이미지 업로드 및 룸 업데이트 성공', imageUrls };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/update-classification-images')
  async updateClassificationImages(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UploadClassificationImagesDto,
    @Request() req,
  ) {
    const room = await this.roomService.findRoomById(id);
    if (!room || room.creator.id !== req.user.id) {
      throw new NotFoundException('룸을 찾을 수 없거나 이미지 업데이트 권한이 없습니다.');
    }

    await this.roomService.updateRoomClassificationImages(id, updateDto.normalImages || [], updateDto.abnormalImages || []);

    // 삭제할 이미지 파일 찾기 및 삭제
    const oldNormalImages = room.normalImages || [];
    const oldAbnormalImages = room.abnormalImages || [];

    const imagesToDelete = [
      ...oldNormalImages.filter(url => !(updateDto.normalImages || []).includes(url)),
      ...oldAbnormalImages.filter(url => !(updateDto.abnormalImages || []).includes(url)),
    ];

    const uploadDir = join(process.cwd(), 'uploads', 'classification_images');

    for (const imageUrl of imagesToDelete) {
      const filename = imageUrl.split('/').pop(); // URL에서 파일 이름 추출
      if (!filename) {
        console.warn(`Could not extract filename from URL: ${imageUrl}`);
        continue;
      }
      const filePath = join(uploadDir, filename);
      try {
        await fs.unlink(filePath);
        console.log(`Deleted image file: ${filePath}`);
      } catch (error) {
        console.error(`Failed to delete image file ${filePath}:`, error.message);
      }
    }

    // AI 서버 캐시 무효화 호출
    const aiApiUrl = this.configService.get<string>('AI_API_URL')+'/clear-cache';
    const aiApiKey = this.configService.get<string>('AI_API_KEY_SECRET'); // .env에서 AI_API_KEY_SECRET 가져오기
    try {
      await this.httpService.post(aiApiUrl, { roomId: id }, {
        headers: {
          'X-API-Key': aiApiKey,
        },
      }).toPromise(); // Observable을 Promise로 변환
      console.log(`AI server cache cleared for room ${id}`);
    } catch (error) {
      console.error(`Failed to clear AI server cache for room ${id}:`, error.message);
      // 캐시 무효화 실패가 핵심 기능에 영향을 주지 않으므로 에러를 던지지 않고 로깅만 합니다.
    }

    return { message: '분류 이미지 업데이트 성공' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':roomId/users/:userId/generate-description')
  async generateDescription(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req,
  ) {
    // 룸 소유자 또는 관리자만 접근 가능하도록 검증
    const room = await this.roomService.findRoomById(roomId);
    if (!room || room.creator.id !== req.user.id) {
      throw new NotFoundException('룸을 찾을 수 없거나 권한이 없습니다.');
    }

    return this.roomService.generateCustomDescription(roomId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const room = await this.roomService.findRoomById(id);
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }
    if (room.creator.id !== req.user.id) {
      throw new UnauthorizedException('룸을 삭제할 권한이 없습니다.');
    }
    await this.roomService.deleteRoom(id);
    return { message: '룸이 성공적으로 삭제되었습니다.' };
  }
}