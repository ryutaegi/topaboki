import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // HttpModule 임포트
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { Room } from './room.entity';
import { User } from '../user/user.entity'; // User 엔티티 임포트

@Module({
  imports: [TypeOrmModule.forFeature([Room, User]), HttpModule], // HttpModule 추가
  providers: [RoomService],
  controllers: [RoomController],
  exports: [RoomService],
})
export class RoomModule {}