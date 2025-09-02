import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: { googleId: string; email: string; firstName: string; lastName: string }): Promise<User> {
    let user = await this.usersRepository.findOne({ where: { googleId: profile.googleId } });

    if (!user) {
      user = this.usersRepository.create({
        googleId: profile.googleId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'user',
        isRegistrationComplete: false, // 첫 Google 로그인 시 false
      });
      await this.usersRepository.save(user);
    }
    return user;
  }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, email, role, affiliation, disabilityType, disabilityLevel } = createUserDto;

    // 사용자 이름 또는 이메일 중복 확인
    const existingUser = await this.usersRepository.findOne({ where: [{ username: username }, { email: email }] });
    if (existingUser) {
      throw new BadRequestException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.usersRepository.create({
      username,
      password: hashedPassword,
      email,
      role,
      affiliation: role === 'admin' ? affiliation : undefined, // null 대신 undefined 사용
      disabilityType: role === 'user' ? disabilityType : undefined, // null 대신 undefined 사용
      disabilityLevel: role === 'user' ? disabilityLevel : undefined, // null 대신 undefined 사용
      isRegistrationComplete: true, // 일반 회원가입은 바로 완료
    });

    return this.usersRepository.save(newUser);
  }

  async completeGoogleRegistration(userId: number, dto: CompleteGoogleRegistrationDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = dto.role;
    user.affiliation = dto.role === 'admin' ? dto.affiliation : undefined; // null 대신 undefined 사용
    user.disabilityType = dto.role === 'user' ? dto.disabilityType : undefined; // null 대신 undefined 사용
    user.disabilityLevel = dto.role === 'user' ? dto.disabilityLevel : undefined; // null 대신 undefined 사용
    user.isRegistrationComplete = true;

    return this.usersRepository.save(user);
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role, isRegistrationComplete: user.isRegistrationComplete };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
