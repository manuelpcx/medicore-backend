import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RecaptchaService } from './recaptcha.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Subscription } from '../payments/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, Patient, Exam, Subscription]),
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, RecaptchaService, JwtStrategy],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
