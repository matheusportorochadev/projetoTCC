#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/262d9014fd79fd6570d42e23c5c465a2c6afc07dc6a0627f78d6387e4ef74e67/contract';
import endContract from '../../snapshots/262d9014fd79fd6570d42e23c5c465a2c6afc07dc6a0627f78d6387e4ef74e67/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02/contract';
import startContract from '../../snapshots/8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'usuario',
        column: col('versaoSessao', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
