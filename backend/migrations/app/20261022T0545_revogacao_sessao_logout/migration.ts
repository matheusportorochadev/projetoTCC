#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/89bfb590e757f4f0ef44a470c533f4e277206821b41f0cfc75fa90fe25a195a6/contract';
import startContract from '../../snapshots/89bfb590e757f4f0ef44a470c533f4e277206821b41f0cfc75fa90fe25a195a6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02/contract';
import endContract from '../../snapshots/8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'sessaoRevogada',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['tokenHash'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sessaoRevogada',
        index: 'sessaoRevogada_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sessaoRevogada',
        index: 'sessaoRevogada_usuarioId_idx_5f01c7d6',
        columns: ['usuarioId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
