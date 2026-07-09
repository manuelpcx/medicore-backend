import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join, isAbsolute } from 'path';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Exam } from '../exams/entities/exam.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_COST = 10; // >= 10 (R5); corrige M4

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('No se pudo completar el registro con los datos proporcionados.');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email,
      nombre: dto.nombre,
      password: hashed,
      fecha_nacimiento: dto.fecha_nacimiento as any,
      tipo_sangre: dto.tipo_sangre,
      // Registrar consentimiento con timestamp para auditoría legal (Ley 19.628 / 21.719)
      consent_accepted: true,
      consent_date: new Date(),
    });
    await this.userRepo.save(user);

    // Crear perfil de paciente vinculado
    const patient = this.patientRepo.create({ user_id: user.id });
    await this.patientRepo.save(patient);

    const tokens = await this.generateTokens(user);
    return { user: this.sanitize(user), ...tokens, message: 'Cuenta creada exitosamente' };
  }

  async login(dto: LoginDto) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    // No emitir tokens a una cuenta desactivada; mismo mensaje genérico (R1, R2).
    if (!user.activo) throw new UnauthorizedException('Credenciales incorrectas');

    // Registrar último login (usado por el panel de administración)
    user.last_login_at = new Date();
    await this.userRepo.update(user.id, { last_login_at: user.last_login_at });

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

    // Localizar la sesión concreta: comparar el token recibido contra el hash
    // almacenado de cada fila candidata (no aceptar por la mera existencia de
    // alguna fila no revocada del usuario). (R4)
    const digest = this.hashDigest(refreshToken);
    const rows = await this.refreshRepo.find({
      where: {
        user_id: payload.sub,
        revocado: false,
        expires_at: MoreThan(new Date()),
      },
    });
    let match: RefreshToken | undefined;
    for (const row of rows) {
      if (await bcrypt.compare(digest, row.token_hash)) {
        match = row;
        break;
      }
    }
    if (!match) throw new UnauthorizedException('Sesión no encontrada');

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '15m' },
    );

    return { access_token: accessToken, message: 'Token renovado' };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken !== undefined) {
      // Revocar únicamente la sesión cuyo hash coincide con el token recibido (R7).
      // Idempotente: si ninguna coincide, no es un error.
      const digest = this.hashDigest(refreshToken);
      const rows = await this.refreshRepo.find({
        where: { user_id: userId, revocado: false },
      });
      for (const row of rows) {
        if (await bcrypt.compare(digest, row.token_hash)) {
          await this.refreshRepo.update({ id: row.id }, { revocado: true });
          break;
        }
      }
    } else {
      // Sin token: revocar todas las sesiones activas del usuario (R8).
      await this.refreshRepo.update({ user_id: userId, revocado: false }, { revocado: true });
    }
    return { message: 'Sesión cerrada' };
  }

  /**
   * Derecho de supresión / eliminación — Art. 12 Ley 19.628 / Ley 21.719 (Chile).
   * Elimina permanentemente la cuenta, todos los datos médicos asociados
   * y los archivos físicos de exámenes del servidor.
   */
  async deleteAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { patient: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 1. Recopilar y eliminar SOLO los archivos físicos de los exámenes
    //    de este usuario (derivado de la BD, no de un readdir de la carpeta).
    //    Debe hacerse ANTES de userRepo.remove: el onDelete CASCADE de Exam
    //    borra las filas y dejaría inaccesible archivo_path.
    if (user.patient) {
      const exams = await this.examRepo.find({
        where: { patient_id: user.patient.id },
        select: { id: true, archivo_path: true },
      });
      for (const exam of exams) {
        if (!exam.archivo_path) continue; // R4
        const fullPath = this.resolveFilePath(exam.archivo_path); // R5
        try {
          if (existsSync(fullPath)) unlinkSync(fullPath); // R1, R4
        } catch {
          // no interrumpir el borrado de cuenta por un archivo individual (R4)
        }
      }
    }

    // 2. Revocar todos los refresh tokens
    await this.refreshRepo.update({ user_id: userId }, { revocado: true });

    // 3. Eliminar usuario — CASCADE en BD elimina patient + todos los datos médicos
    await this.userRepo.remove(user);

    return {
      message: 'Cuenta eliminada permanentemente. Todos tus datos han sido borrados.',
    };
  }

  /**
   * Resuelve la ruta física del archivo. `archivo_path` (de multer) puede ser
   * absoluto (UPLOAD_PATH absoluto) o relativo (UPLOAD_PATH relativo). Misma
   * semántica que ExamsService.resolveFilePath: no usar join() a ciegas, ya que
   * join(cwd, rutaAbsoluta) produce una ruta incorrecta.
   */
  private resolveFilePath(archivoPath: string): string {
    return isAbsolute(archivoPath) ? archivoPath : join(process.cwd(), archivoPath);
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

    // Cada login/register crea su propia sesión (fila independiente); no se
    // revocan las demás sesiones del usuario. (R6)
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const tokenHash = await bcrypt.hash(this.hashDigest(refresh_token), BCRYPT_COST);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        token_hash: tokenHash,
        user_id: user.id,
        expires_at: expires,
      }),
    );

    return { access_token, refresh_token };
  }

  // Digest de longitud fija (64 chars hex, < 72 bytes) para no chocar con el
  // límite de 72 bytes de bcrypt y preservar toda la entropía del token. (R4)
  private hashDigest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Normalización única (trim + lowercase) aplicada de forma idéntica en
  // register y login para tratar emails equivalentes como la misma cuenta. (R3, R4, R5)
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private sanitize(user: User) {
    const { password, ...safe } = user as any;
    return safe;
  }
}
