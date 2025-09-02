import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany } from 'typeorm';
import { User } from '../user/user.entity';

// 새로운 Step 구조에 대한 인터페이스 정의
export interface SimpleStep {
  imageUrls: string[];
  description: string;
}

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  password?: string;

  // 타입을 Record<string, SimpleStep[]>로 변경. MySQL 제약으로 default 값은 서비스 로직에서 처리.
  @Column({ type: 'json', nullable: true })
  steps: Record<string, SimpleStep[]>;

  @Column({ type: 'json', nullable: true })
  normalImages: string[];

  @Column({ type: 'json', nullable: true })
  abnormalImages: string[];

  @ManyToOne(() => User, (user) => user.createdRooms, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  creator: User;

  @ManyToMany(() => User, (user) => user.joinedRooms)
  users: User[];
}