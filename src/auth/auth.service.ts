import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Patient } from '../patients/entities/patient.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      nombre: dto.nombre,
      password: hashed,
      fecha_nacimiento: dto.fecha_nacimiento as any,
      tipo_sangre: dto.tipo_sangre,
    });
    await this.userRepo.save(user);

    // Crear perfil de paciente vinculado
    const patient = this.patientRepo.create({ user_id: user.id });
    await this.patientRepo.save(patient);

    const tokens = await this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens, message: 'Cuenta creada exitosamente' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    const tokens = await this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens, message: 'Sesión iniciada' };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const stored = await this.refreshRepo.findOne({
      where: { user_id: payload.sub, revocado: false },
    });
    if (!stored) throw new UnauthorizedException('Sesión no encontrada');

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' },
    );

    return { access_token: accessToken, message: 'Token renovado' };
  }

  async logout(userId: string) {
    await this.refreshRepo.update({ user_id: userId, revocado: false }, { revocado: true });
    return { message: 'Sesión cerrada' };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const access_token = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Invalidar tokens anteriores del usuario
    await this.refreshRepo.update({ user_id: user.id, revocado: false }, { revocado: true });

    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const tokenHash = await bcrypt.hash(refresh_token, 5);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: expires,
      }),
    );

    return { access_token, refresh_token };
  }

  private sanitize(user: User) {
    const { password, ...safe } = user as any;
    return safe;
  }
}
