import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cambia a `text` las columnas sensibles que ahora se cifran (AES-256-GCM).
 * El texto cifrado (base64) es más largo que el valor original, y varias columnas
 * eran numeric/int/date; todas pasan a `text` para almacenar el ciphertext.
 *
 * Las columnas que ya eran `text` (diagnostico, notas, direccion) no se tocan.
 *
 * Tras aplicar esta migración, ejecutar el backfill una vez para cifrar los
 * datos existentes:  npm run encrypt-backfill
 *
 * NOTA sobre down(): revertir a numeric/date SÓLO funciona si los datos aún NO
 * están cifrados. Una vez cifrados, el cast fallará (es esperado: el cifrado es
 * una operación de una vía sin la llave).
 */
export class EncryptSensitiveColumns1700000000003 implements MigrationInterface {
  name = 'EncryptSensitiveColumns1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "nombre"           TYPE text USING "nombre"::text,
        ALTER COLUMN "fecha_nacimiento" TYPE text USING "fecha_nacimiento"::text,
        ALTER COLUMN "tipo_sangre"      TYPE text USING "tipo_sangre"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "patients"
        ALTER COLUMN "peso"                 TYPE text USING "peso"::text,
        ALTER COLUMN "altura"               TYPE text USING "altura"::text,
        ALTER COLUMN "presion_arterial"     TYPE text USING "presion_arterial"::text,
        ALTER COLUMN "frecuencia_cardiaca"  TYPE text USING "frecuencia_cardiaca"::text,
        ALTER COLUMN "temperatura"          TYPE text USING "temperatura"::text,
        ALTER COLUMN "telefono"             TYPE text USING "telefono"::text,
        ALTER COLUMN "contacto_emergencia"  TYPE text USING "contacto_emergencia"::text,
        ALTER COLUMN "telefono_emergencia"  TYPE text USING "telefono_emergencia"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "medical_history"
        ALTER COLUMN "especialidad" TYPE text USING "especialidad"::text,
        ALTER COLUMN "doctor"       TYPE text USING "doctor"::text,
        ALTER COLUMN "institucion"  TYPE text USING "institucion"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "medications"
        ALTER COLUMN "nombre"           TYPE text USING "nombre"::text,
        ALTER COLUMN "dosis"            TYPE text USING "dosis"::text,
        ALTER COLUMN "frecuencia"       TYPE text USING "frecuencia"::text,
        ALTER COLUMN "horario"          TYPE text USING "horario"::text,
        ALTER COLUMN "medico_recetante" TYPE text USING "medico_recetante"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "exams"
        ALTER COLUMN "nombre"         TYPE text USING "nombre"::text,
        ALTER COLUMN "laboratorio"    TYPE text USING "laboratorio"::text,
        ALTER COLUMN "tipo"           TYPE text USING "tipo"::text,
        ALTER COLUMN "archivo_nombre" TYPE text USING "archivo_nombre"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "allergies"
        ALTER COLUMN "nombre" TYPE text USING "nombre"::text
    `);

    await queryRunner.query(`
      ALTER TABLE "vaccines"
        ALTER COLUMN "nombre"      TYPE text USING "nombre"::text,
        ALTER COLUMN "lote"        TYPE text USING "lote"::text,
        ALTER COLUMN "institucion" TYPE text USING "institucion"::text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reversión best-effort de tipos (falla si los datos ya están cifrados).
    await queryRunner.query(`
      ALTER TABLE "vaccines"
        ALTER COLUMN "nombre"      TYPE character varying USING "nombre"::character varying,
        ALTER COLUMN "lote"        TYPE character varying USING "lote"::character varying,
        ALTER COLUMN "institucion" TYPE character varying USING "institucion"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "allergies"
        ALTER COLUMN "nombre" TYPE character varying USING "nombre"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "exams"
        ALTER COLUMN "nombre"         TYPE character varying USING "nombre"::character varying,
        ALTER COLUMN "laboratorio"    TYPE character varying USING "laboratorio"::character varying,
        ALTER COLUMN "tipo"           TYPE character varying USING "tipo"::character varying,
        ALTER COLUMN "archivo_nombre" TYPE character varying USING "archivo_nombre"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "medications"
        ALTER COLUMN "nombre"           TYPE character varying USING "nombre"::character varying,
        ALTER COLUMN "dosis"            TYPE character varying USING "dosis"::character varying,
        ALTER COLUMN "frecuencia"       TYPE character varying USING "frecuencia"::character varying,
        ALTER COLUMN "horario"          TYPE character varying USING "horario"::character varying,
        ALTER COLUMN "medico_recetante" TYPE character varying USING "medico_recetante"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "medical_history"
        ALTER COLUMN "especialidad" TYPE character varying USING "especialidad"::character varying,
        ALTER COLUMN "doctor"       TYPE character varying USING "doctor"::character varying,
        ALTER COLUMN "institucion"  TYPE character varying USING "institucion"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "patients"
        ALTER COLUMN "peso"                 TYPE numeric(5,2) USING "peso"::numeric,
        ALTER COLUMN "altura"               TYPE numeric(5,2) USING "altura"::numeric,
        ALTER COLUMN "presion_arterial"     TYPE character varying USING "presion_arterial"::character varying,
        ALTER COLUMN "frecuencia_cardiaca"  TYPE integer USING "frecuencia_cardiaca"::integer,
        ALTER COLUMN "temperatura"          TYPE numeric(4,1) USING "temperatura"::numeric,
        ALTER COLUMN "telefono"             TYPE character varying USING "telefono"::character varying,
        ALTER COLUMN "contacto_emergencia"  TYPE character varying USING "contacto_emergencia"::character varying,
        ALTER COLUMN "telefono_emergencia"  TYPE character varying USING "telefono_emergencia"::character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "nombre"           TYPE character varying USING "nombre"::character varying,
        ALTER COLUMN "fecha_nacimiento" TYPE date USING "fecha_nacimiento"::date,
        ALTER COLUMN "tipo_sangre"      TYPE character varying USING "tipo_sangre"::character varying
    `);
  }
}
