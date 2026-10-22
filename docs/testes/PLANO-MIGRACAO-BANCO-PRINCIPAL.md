# Banco principal preservado — prioridade substituída

Em 22/10/2026 o usuário redefiniu a prioridade: a futura produção usará **PostgreSQL novo e vazio na AWS**, sem migração dos registros locais. Não será preparada nem aplicada atualização no principal nesta etapa. O procedimento prioritário é [PLANO-PRODUCAO-AWS.md](PLANO-PRODUCAO-AWS.md), incluindo inicialização limpa validada.

Antes dessa orientação foram consultados somente catálogos e assinatura, com `default_transaction_read_only=on`, `BEGIN READ ONLY`, timeout de cinco segundos e ROLLBACK. Nenhuma linha de usuário/paciente/prontuário foi lida, copiada ou alterada.

Estado observado: principal PostgreSQL 18.6, 15 tabelas públicas/122 colunas, assinatura `89bfb590…`; testes 16 tabelas/127 colunas, assinatura atual `262d9014…`. Diferenças: tabela `sessaoRevogada` (quatro colunas, PK e dois índices) e `usuario.versaoSessao int4 NOT NULL DEFAULT 0`. Os 58 índices anteriores estão presentes entre os 61 de testes; todas as restrições anteriores estão preservadas, incluindo 13 FKs. Tipos/nulabilidade/defaults das colunas comuns coincidem. Há diferença de posição física de seis colunas de disponibilidade, sem diferença de definição: não reordenar ou recriar tabela por isso.

`jti` é um claim JWT, sem coluna própria. As correções CPF/datas/concorrência não exigem backfill ou alteração de registros existentes. O contrato já inclui armazenamento clínico criptografado e auditorias; não há drift adicional demonstrado entre os bancos nos metadados comparados.

Os planos históricos de backup, aplicação aditiva e reversão continuam em [AUDITORIA-MIGRACAO-SESSOES.md](AUDITORIA-MIGRACAO-SESSOES.md) e [CORRECAO-SEIS-DEFEITOS.md](CORRECAO-SEIS-DEFEITOS.md). Se a decisão mudar futuramente: autorizar manutenção, backup privado e restauração de ensaio segregada; conferir banco/plano; criar tabela/índices de revogação e depois coluna de versão, atualizando assinatura ORM; iniciar somente processos compatíveis. Não executar a baseline sobre banco existente, não remover revogações ou zerar versões como reversão. Não foi realizado backup, DDL, restauração ou migração no principal.
