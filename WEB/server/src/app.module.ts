import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user/user.entity';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { Room } from './room/room.entity'; // Room 엔티티 임포트
import { RoomModule } from './room/room.module'; // RoomModule 임포트
import { TtsModule } from './tts/tts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: 'prod.env',
      isGlobal: true,
    }),
    HttpModule, // HttpModule 추가
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306', 10),
      username: process.env.DATABASE_USER || 'admin',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'topaboki',
      entities: [User, Room], // Room 엔티티 추가
      synchronize: true,
    }),
    UserModule,
    AuthModule,
    RoomModule,
    TtsModule, // RoomModule 등록
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
