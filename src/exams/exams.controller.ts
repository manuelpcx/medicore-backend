import {
  Controller, Get, Post, Delete, Body, Param,
  ParseUUIDPipe, UseInterceptors, UploadedFile,
  Res, StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { createReadStream } from 'fs';
import type { Response } from 'express';

const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF e imágenes (JPEG, PNG, WEBP)'), false);
  }
};

// Construye un valor de Content-Disposition seguro contra inyección de cabecera.
// Sanea el nombre para el token ASCII `filename="..."` y añade el parámetro
// RFC 5987 `filename*` con el nombre real pct-encodeado en UTF-8.
function safeContentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const raw = filename ?? '';
  const asciiFallback =
    raw
      .replace(/[\x00-\x1F\x7F]/g, '') // quita controles C0/DEL (incl. CR y LF) -> R1
      .replace(/[/"\\]/g, '_')          // barra, comilla doble y backslash -> R2
      .replace(/[^\x20-\x7E]/g, '_')    // resto de no-ASCII -> '_'
      .trim() || 'archivo';             // por defecto seguro -> R4
  const encoded =
    encodeURIComponent(raw)             // pct-encode UTF-8
      .replace(/['()*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()); // RFC 5987 ext-value -> R3
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

@ApiTags('Exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly service: ExamsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar exámenes' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Subir examen (con archivo opcional)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage,
      fileFilter,
      limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024 },
    }),
  )
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExamDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.create(userId, dto, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener examen por ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(userId, id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Descargar archivo del examen' })
  async getFile(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { path, mimetype, nombre } = await this.service.getFile(userId, id);
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': safeContentDisposition('inline', nombre),
    });
    return new StreamableFile(createReadStream(path));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar examen' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
