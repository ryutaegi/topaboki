import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm'; // 필요한 데코레이터 임포트
import { Room } from '../room/room.entity'; // Room 엔티티 임포트

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ unique: true, nullable: true })
  googleId?: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  affiliation?: string;

  @Column({ nullable: true })
  disabilityType?: string;

  @Column({ nullable: true })
  disabilityLevel?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ default: false })
  isRegistrationComplete: boolean;

  // 룸별 포인트를 저장하는 필드 추가
  @Column({ type: 'json' })
  points: { [roomId: string]: number } = {}; // 여기에 빈 객체로 초기화

  // 사용자가 생성한 룸 (관리자용)
  @OneToMany(() => Room, room => room.creator)
  createdRooms: Room[];

  // 사용자가 참여한 룸
  @ManyToMany(() => Room, room => room.users)
  @JoinTable() // 중간 테이블 자동 생성
  joinedRooms: Room[];
}
