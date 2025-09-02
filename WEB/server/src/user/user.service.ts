import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto'; // DTO는 나중에 생성

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    // email은 고유하며 변경 불가능하므로 업데이트 대상에서 제외
    // updateUserDto에는 email 필드가 없으므로, 별도로 제외할 필요 없음
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async getUserPointsInRoom(userId: number, roomId: string): Promise<number> {
    const user = await this.findById(userId);
    return (user.points || {})[roomId] || 0; // 해당 룸의 포인트가 없으면 0 반환
  }

  async updateUserPointsInRoom(userId: number, roomId: string, points: number): Promise<User> {
    const user = await this.findById(userId);
    user.points = {
      ...user.points,
      [roomId]: points,
    };
    return this.usersRepository.save(user);
  }
}