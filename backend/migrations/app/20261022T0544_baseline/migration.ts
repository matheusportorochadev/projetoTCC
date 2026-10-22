#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/89bfb590e757f4f0ef44a470c533f4e277206821b41f0cfc75fa90fe25a195a6/contract';
import endContract from '../../snapshots/89bfb590e757f4f0ef44a470c533f4e277206821b41f0cfc75fa90fe25a195a6/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'acessoProntuario',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('senhaHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('versaoAutorizacao', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'agendamento',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('data', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('horaFim', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('horaInicio', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pacienteId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDENTE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'agendamento_status_check_ea658e59',
            "\"status\" IN ('AGENDADA', 'PENDENTE', 'CONFIRMADA', 'REALIZADA', 'RECUSADA', 'CANCELADA', 'FALTOU')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditoriaAgenda',
        columns: [
          col('acao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('agendamentoId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dataAgenda', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('disponibilidadeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('horaFim', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('horaInicio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('requisicaoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resultado', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditoriaLogin',
        columns: [
          col('acao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('perfil', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requisicaoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resultado', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditoriaPaciente',
        columns: [
          col('acao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('pacienteId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('requisicaoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resultado', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'auditoriaProntuario',
        columns: [
          col('acao', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('pacienteId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('prontuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('requisicaoId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('resultado', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'codigoPrimeiroAcesso',
        columns: [
          col('codigoHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiraEm', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tentativas', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('usado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'codigoRecuperacaoProntuario',
        columns: [
          col('codigoHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiraEm', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tentativas', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('usado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'codigoRedefinicaoSenha',
        columns: [
          col('codigo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiraEm', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'disponibilidadeAgenda',
        columns: [
          col('ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('data', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('duracaoConsulta', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('horaFim', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('horaInicio', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'medico',
        columns: [
          col('crm', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usuarioId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'paciente',
        columns: [
          col('acessoLiberado', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('cpf', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('telefone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('usuarioId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'prontuario',
        columns: [
          col('conduta', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('conteudoCriptografado', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('exameFisico', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('examesComplementares', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('historiaMolestiaAtual', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('historiaPatologicaPregressa', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('medicoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('pacienteId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('prontuarioAnteriorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('queixaPrincipal', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('versaoChave', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('versaoSchema', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'remarcacaoAgendamento',
        columns: [
          col('agendamentoId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('novaData', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('novaHoraFim', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('novaHoraInicio', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDENTE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('visualizadoPaciente', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'remarcacaoAgendamento_status_check_1b3b9d6e',
            "\"status\" IN ('PENDENTE', 'ACEITA', 'RECUSADA')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'usuario',
        columns: [
          col('ativo', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('primeiroAcesso', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('senha', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('tipo', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'usuario_tipo_check_bfb6584f',
            "\"tipo\" IN ('ADMIN', 'MEDICO', 'PACIENTE')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'acessoProntuario',
        constraint: 'acessoProntuario_medicoId_key',
        columns: ['medicoId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'medico',
        constraint: 'medico_usuarioId_key',
        columns: ['usuarioId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'medico',
        constraint: 'medico_crm_key',
        columns: ['crm'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'paciente',
        constraint: 'paciente_usuarioId_key',
        columns: ['usuarioId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'paciente',
        constraint: 'paciente_cpf_key',
        columns: ['cpf'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'usuario',
        constraint: 'usuario_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agendamento',
        index: 'agendamento_medicoId_data_horaInicio_idx_1b9f7301',
        columns: ['medicoId', 'data', 'horaInicio'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agendamento',
        index: 'agendamento_medicoId_data_idx_20edd9d1',
        columns: ['medicoId', 'data'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agendamento',
        index: 'agendamento_medicoId_idx_cef7d96a',
        columns: ['medicoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agendamento',
        index: 'agendamento_pacienteId_data_idx_4b9c5eee',
        columns: ['pacienteId', 'data'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agendamento',
        index: 'agendamento_pacienteId_idx_8734dc3f',
        columns: ['pacienteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_acao_createdAt_idx_1bb6e007',
        columns: ['acao', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_agendamentoId_createdAt_idx_aba1c0f9',
        columns: ['agendamentoId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_disponibilidadeId_createdAt_idx_71c80c99',
        columns: ['disponibilidadeId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_medicoId_createdAt_idx_d972e011',
        columns: ['medicoId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaAgenda',
        index: 'auditoriaAgenda_usuarioId_createdAt_idx_7f0b6cbd',
        columns: ['usuarioId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaLogin',
        index: 'auditoriaLogin_acao_createdAt_idx_1bb6e007',
        columns: ['acao', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaLogin',
        index: 'auditoriaLogin_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaLogin',
        index: 'auditoriaLogin_resultado_createdAt_idx_f789afcc',
        columns: ['resultado', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaLogin',
        index: 'auditoriaLogin_usuarioId_createdAt_idx_7f0b6cbd',
        columns: ['usuarioId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaPaciente',
        index: 'auditoriaPaciente_acao_createdAt_idx_1bb6e007',
        columns: ['acao', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaPaciente',
        index: 'auditoriaPaciente_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaPaciente',
        index: 'auditoriaPaciente_medicoId_createdAt_idx_d972e011',
        columns: ['medicoId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaPaciente',
        index: 'auditoriaPaciente_pacienteId_createdAt_idx_4c3fde10',
        columns: ['pacienteId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaPaciente',
        index: 'auditoriaPaciente_usuarioId_createdAt_idx_7f0b6cbd',
        columns: ['usuarioId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaProntuario',
        index: 'auditoriaProntuario_acao_createdAt_idx_1bb6e007',
        columns: ['acao', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaProntuario',
        index: 'auditoriaProntuario_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaProntuario',
        index: 'auditoriaProntuario_prontuarioId_createdAt_idx_7fa2c1ea',
        columns: ['prontuarioId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditoriaProntuario',
        index: 'auditoriaProntuario_usuarioId_createdAt_idx_7f0b6cbd',
        columns: ['usuarioId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'codigoPrimeiroAcesso',
        index: 'codigoPrimeiroAcesso_usuarioId_idx_5f01c7d6',
        columns: ['usuarioId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'codigoPrimeiroAcesso',
        index: 'codigoPrimeiroAcesso_usuarioId_usado_idx_564cb520',
        columns: ['usuarioId', 'usado'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'codigoRecuperacaoProntuario',
        index: 'codigoRecuperacaoProntuario_medicoId_idx_cef7d96a',
        columns: ['medicoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'codigoRecuperacaoProntuario',
        index: 'codigoRecuperacaoProntuario_medicoId_usado_idx_44145758',
        columns: ['medicoId', 'usado'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'codigoRedefinicaoSenha',
        index: 'codigoRedefinicaoSenha_usuarioId_idx_5f01c7d6',
        columns: ['usuarioId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disponibilidadeAgenda',
        index: 'disponibilidadeAgenda_medicoId_data_idx_20edd9d1',
        columns: ['medicoId', 'data'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'disponibilidadeAgenda',
        index: 'disponibilidadeAgenda_medicoId_idx_cef7d96a',
        columns: ['medicoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'paciente',
        index: 'paciente_medicoId_idx_cef7d96a',
        columns: ['medicoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prontuario',
        index: 'prontuario_medicoId_idx_cef7d96a',
        columns: ['medicoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prontuario',
        index: 'prontuario_pacienteId_createdAt_idx_4c3fde10',
        columns: ['pacienteId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prontuario',
        index: 'prontuario_pacienteId_idx_8734dc3f',
        columns: ['pacienteId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'remarcacaoAgendamento',
        index: 'remarcacaoAgendamento_agendamentoId_idx_b943086d',
        columns: ['agendamentoId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'remarcacaoAgendamento',
        index: 'remarcacaoAgendamento_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'acessoProntuario',
        foreignKey: {
          name: 'acessoProntuario_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agendamento',
        foreignKey: {
          name: 'agendamento_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agendamento',
        foreignKey: {
          name: 'agendamento_pacienteId_fkey',
          columns: ['pacienteId'],
          references: { schema: 'public', table: 'paciente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'codigoPrimeiroAcesso',
        foreignKey: {
          name: 'codigoPrimeiroAcesso_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'codigoRecuperacaoProntuario',
        foreignKey: {
          name: 'codigoRecuperacaoProntuario_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'codigoRedefinicaoSenha',
        foreignKey: {
          name: 'codigoRedefinicaoSenha_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'disponibilidadeAgenda',
        foreignKey: {
          name: 'disponibilidadeAgenda_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'medico',
        foreignKey: {
          name: 'medico_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'paciente',
        foreignKey: {
          name: 'paciente_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'paciente',
        foreignKey: {
          name: 'paciente_usuarioId_fkey',
          columns: ['usuarioId'],
          references: { schema: 'public', table: 'usuario', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prontuario',
        foreignKey: {
          name: 'prontuario_pacienteId_fkey',
          columns: ['pacienteId'],
          references: { schema: 'public', table: 'paciente', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prontuario',
        foreignKey: {
          name: 'prontuario_medicoId_fkey',
          columns: ['medicoId'],
          references: { schema: 'public', table: 'medico', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'remarcacaoAgendamento',
        foreignKey: {
          name: 'remarcacaoAgendamento_agendamentoId_fkey',
          columns: ['agendamentoId'],
          references: { schema: 'public', table: 'agendamento', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
