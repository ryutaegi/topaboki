import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto, SimpleStepDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { User } from '../user/user.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import { join } from 'path';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // Helper function to migrate old step format to new format
  private transformStepsToNewFormat(steps: any): Record<string, SimpleStepDto[]> {
    if (!steps || typeof steps !== 'object') {
        return { default: [] };
    }

    // If it's already in the new format (an object with keys like 'default'), return as is
    if (Object.keys(steps).some(k => Array.isArray(steps[k]))) {
        return steps as Record<string, SimpleStepDto[]>;
    }

    // If it's the old format (an array), transform it
    if (Array.isArray(steps)) {
        const defaultSteps = steps.map(step => ({
            imageUrls: step.imageUrls || [],
            description: step.description?.default || ''
        }));
        return { default: defaultSteps };
    }

    return { default: [] };
}


  async createRoom(createRoomDto: CreateRoomDto, creator: User): Promise<Room> {
    const room = this.roomRepository.create({
      ...createRoomDto,
      creator,
      steps: { default: [] }, // 애플리케이션 레벨에서 기본값 설정
    });
    return this.roomRepository.save(room);
  }

  async findRoomByName(name: string): Promise<Room | null> {
    return this.roomRepository.findOne({ where: { name } });
  }

  async getRoomsByCreator(creatorId: number): Promise<Room[]> {
    return this.roomRepository.find({
      where: { creator: { id: creatorId } },
      relations: ['creator'],
    });
  }

  async getUsersInRoom(roomId: number): Promise<User[]> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['users'],
    });
    return room ? room.users : [];
  }

  async findRoomById(id: number): Promise<Room | null> {
    return this.roomRepository.findOne({ where: { id }, relations: ['creator'] });
  }

  async getRoomWithUsers(id: number): Promise<Room | null> {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: ['users', 'creator'],
    });

    if (room) {
      room.steps = this.transformStepsToNewFormat(room.steps);
    }

    return room;
  }

  async updateRoomClassificationImages(id: number, normalImages: string[], abnormalImages: string[]): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }
    room.normalImages = normalImages;
    room.abnormalImages = abnormalImages;
    return this.roomRepository.save(room);
  }

  async findAllRooms(): Promise<Room[]> {
    return this.roomRepository.find({
      select: ['id', 'name'],
    });
  }

  async joinRoom(roomId: number, passwordAttempt: string | undefined, user: User): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['users'],
    });

    if (!room) {
      throw new BadRequestException('룸을 찾을 수 없습니다.');
    }

    if (room.password && room.password !== passwordAttempt) {
      throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
    }

    if (room.users.some(u => u.id === user.id)) {
      return room;
    }

    room.users.push(user);
    return this.roomRepository.save(room);
  }

  async getJoinedRoomsByUser(userId: number): Promise<Room[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['joinedRooms'],
    });
    return user ? user.joinedRooms : [];
  }

  async updateRoomSettings(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }
    if (updateRoomDto.name) {
      room.name = updateRoomDto.name;
    }
    if (updateRoomDto.password !== undefined) {
      room.password = updateRoomDto.password;
    }
    if (updateRoomDto.steps) {
      room.steps = updateRoomDto.steps;
    }
    return this.roomRepository.save(room);
  }

  async deleteRoom(id: number): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id }, relations: ['users'] });
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }

    // Clear the ManyToMany relationship to remove entries from the join table
    room.users = [];
    await this.roomRepository.save(room); // Save to update the join table

    // Delete associated classification images
    const imagesToDelete = [...(room.normalImages || []), ...(room.abnormalImages || [])];
    const uploadDir = join(process.cwd(), 'uploads', 'classification_images');

    for (const imageUrl of imagesToDelete) {
      const filename = imageUrl.split('/').pop();
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

    await this.roomRepository.delete(id);
  }

  async generateCustomDescription(roomId: number, userId: number): Promise<{ description: string }> {
    const room = await this.getRoomWithUsers(roomId);
    if (!room) {
      throw new NotFoundException('룸을 찾을 수 없습니다.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const defaultSteps = room.steps['default'] || [];
    const base_description = defaultSteps.map((step, index) => `${index + 1}. ${step.description}`).join('\n');
    
    const disability_info = `장애 유형: ${user.disabilityType}, 장애 등급: ${user.disabilityLevel}, 특이사항: ${user.notes || '없음'}`;

    const aiApiUrl = this.configService.get<string>('AI_API_URL');
    const aiApiKey = this.configService.get<string>('AI_API_KEY_SECRET');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${aiApiUrl}/generate-description`,
          { base_description, disability_info },
          { headers: { 'x-api-key': aiApiKey } },
        ),
      );
      return response.data;
    } catch (error) {
      console.error('AI 서버 통신 오류:', error.response?.data || error.message);
      throw new InternalServerErrorException('AI 서버와 통신하는 중 오류가 발생했습니다.');
    }
  }
}