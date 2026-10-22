# Correção dos três defeitos de regras de negócio — 22/10/2026

## Escopo e causas

O relatório `DEFEITOS-REGRAS-NEGOCIO.md` foi revisado antes das alterações. Os 173 testes existentes e suas expectativas foram preservados. As alterações desta etapa não modificam perfis, estados de consultas, regras de bloqueio ou autorizações clínicas.

- **NEG-01:** o schema validava a quantidade de dígitos, mas schema, serviços e UNIQUE comparavam representações diferentes do CPF.
- **NEG-02:** a solicitação do paciente validava formato e disponibilidade, sem verificar a data em relação ao dia atual. A solicitação de remarcação apresentava a mesma lacuna.
- **NEG-03:** conflitos encontrados dentro da transação chegavam ao tratamento genérico de erro interno; a verificação anterior à transação já retornava 409.

## Correções

### CPF e preservação do legado

`backend/src/utils/cpf.ts` centraliza a normalização para 11 dígitos, mantendo as restrições de caracteres existentes. Schema, criação e atualização usam a mesma função. Não foi acrescentada validação matemática de CPF.

Criação e atualização que informam CPF adquirem um bloqueio PostgreSQL transacional por CPF canônico, por meio de `pg_advisory_xact_lock` em namespace próprio e `hashtext`. Em seguida, uma consulta parametrizada compara os dígitos armazenados, inclusive em máscaras antigas, antes de gravar. O bloqueio é liberado no commit/rollback e impede que duas operações desses serviços façam a verificação simultaneamente para o mesmo CPF. Colisões do hash apenas serializam CPFs diferentes.

A atualização do paciente e a sincronização do usuário passam a ocorrer na mesma transação. CPF omitido permanece inalterado, inclusive quando possui máscara antiga. CPF explicitamente informado em uma atualização é persistido na representação canônica. Nenhum lote de normalização, associação de pacientes, alteração de chaves ou fusão de históricos foi executado.

**Limite:** o UNIQUE textual do banco permanece. Escritas diretas que ignorem os serviços não adquirem o bloqueio. Todas as rotas de criação/atualização de CPF da aplicação devem continuar utilizando esses serviços. Duplicidades legadas eventualmente existentes não são corrigidas automaticamente.

### Datas passadas

`validarDataNovaConsulta` centraliza a validação de calendário e a comparação com o dia atual do servidor, seguindo a referência temporal já utilizada na criação manual pelo médico. O controller a chama antes de consultar slots; o serviço também a chama para proteger outros consumidores. A solicitação de remarcação usa a mesma regra.

Datas anteriores ao dia atual retornam 400 mesmo que não exista disponibilidade para elas. A configuração de disponibilidade histórica foi preservada. Não se introduziu uma regra nova para horários já transcorridos dentro do dia atual.

### Concorrência

`ErroAgendamento` distingue erros de domínio. A indisponibilidade encontrada dentro da criação transacional retorna 409. SERIALIZABLE, tentativas limitadas, verificação de sobreposição e auditoria atômica permanecem. Se a criação esgotar as tentativas por SQLSTATE 40001 ou 40P01, a resposta também será 409, convidando a nova tentativa. Outros erros, como conexão ou auditoria, continuam no tratamento de falha interna; não são convertidos indiscriminadamente em conflito.

## Testes complementares

- `frontend/tests/api-pacientes-negocio.spec.ts`: CPF legado de outro médico impede duplicação e permanece intacto; atualização canônica rejeita colisão e preserva o valor anterior na falha; cadastros concorrentes com representações diferentes persistem somente um paciente.
- `frontend/tests/api-agendamentos-negocio.spec.ts`: data passada sem disponibilidade retorna 400 e não cria registros.
- `frontend/tests/api-remarcacoes-negocio.spec.ts`: data passada não pode ser usada como destino da remarcação; consulta original permanece confirmada e nenhum pedido é criado.

`backend/scripts/fixture-negocio.ts` cria um CPF legado com máscara somente para o paciente fictício de sua própria execução. `frontend/tests/helpers/negocio.ts` expõe esse dado fictício tipado. A limpeza continua restrita às identidades e IDs da fixture.

## Banco e migrações

As inicializações e fixtures exigem `NODE_ENV=test`, conexão de `.env.test`, destino local e confirmação efetiva por `SELECT current_database()` igual a `tcc_consultorio_testes`. O seed não foi repetido. As escritas desta etapa são de fixtures e auditorias fictícias nesse banco. Nenhum acesso ou alteração do banco principal foi necessário para estas correções.

**Não há migração obrigatória para os três defeitos.** Não foi criado nem executado SQL de alteração estrutural nesta etapa. A migração de revogação de sessões de uma etapa anterior continua sendo um pré-requisito separado para implantar aquela correção; sua aplicação no principal permanece não autorizada.

Uma futura proteção adicional por índice único da expressão normalizada exigirá auditoria autorizada de duplicidades e avaliação de locks/contrato do ORM. Se houver colisões, a resolução dos registros e históricos deve ser aprovada antes de qualquer alteração. Não executar normalização em massa ou criar índice único no principal sem esse levantamento e nova autorização.

## Desempenho e implantação futura

A verificação de CPF passa de uma busca textual indexada para uma consulta com `regexp_replace`, que pode fazer varredura proporcional ao número de pacientes, mais uma chamada para o bloqueio. Isso ocorre somente em criação com CPF ou atualização que informa CPF; listagens, login, prontuários e agendamentos não recebem essa consulta. Requisições para o mesmo CPF aguardam a transação anterior; CPFs distintos normalmente não se bloqueiam entre si. Atualizações de paciente passam a incluir a abertura/fechamento de uma transação.

Não foi realizado benchmark de produção ou carga pesada. Para bases maiores, medir a consulta e considerar índice de expressão em mudança separada e autorizada. O limite de três tentativas de serialização continua evitando repetição ilimitada.

Antes de futura implantação autorizada: conferir os pré-requisitos de revogação já documentados; concluir a troca de todas as instâncias antigas do backend para que todos os escritores adquiram o bloqueio; executar smoke tests e observar latência/conflitos. Durante uma implantação mista, instâncias antigas ainda podem escrever CPF sem a proteção nova. Reverter o código não desfaz novos CPFs canônicos, que continuam sendo strings válidas na estrutura atual; porém reabre os três defeitos. Backup e restauração do principal permanecem procedimentos separados, mediante autorização, conforme a auditoria de migração existente.

## Resultado da validação

A bateria focada inicial executou os 43 testes existentes de pacientes, agendamentos e concorrência: **43 aprovados**, incluindo as três regressões originais.

`npm run test:all` encerrou com código **0**:

| Verificação | Aprovados | Reprovados | Ignorados | Duração |
| --- | ---: | ---: | ---: | ---: |
| Backend — testes de sessões | 8 | 0 | 0 | 0,70 s |
| Interface Chromium | 16 | 0 | 0 | 8,34 s |
| Integração HTTP | 154 | 0 | 0 | 241,16 s |
| **Total** | **178** | **0** | **0** | — |

TypeScript do backend, TypeScript dos testes e build do frontend aprovados. Os relatórios Playwright indicam zero testes instáveis. Os 173 anteriores estão aprovados e os cinco complementos também. Os 30 originais e os cenários de revogação após reinicialização do backend continuam aprovados.

Na evidência de concorrência, os três pares retornaram `[[201,409],[201,409],[201,409]]`, com três consultas persistidas em três slots distintos. Não houve duplicação. Os testes adicionais de CPF legado, alteração e concorrência, assim como remarcação passada, passaram na execução completa. Não surgiram outros defeitos nessa execução; isso não representa cobertura de todas as baterias ainda pendentes da missão.

Relatórios locais ignorados pelo Git: `frontend/playwright-report/` e `frontend/playwright-report-integration/`. A duração não constitui benchmark: não foram forçados esgotamento de tentativas transacionais ou carga de produção. A análise de custo da consulta de CPF acima permanece aplicável.

## Arquivos desta etapa

- `backend/src/utils/cpf.ts` (novo)
- `backend/src/schemas/paciente.schema.ts`
- `backend/src/services/paciente.service.ts`
- `backend/src/services/agendamento.service.ts`
- `backend/src/controllers/agendamento.controller.ts`
- `backend/scripts/fixture-negocio.ts`
- `frontend/tests/helpers/negocio.ts`
- `frontend/tests/api-pacientes-negocio.spec.ts`
- `frontend/tests/api-agendamentos-negocio.spec.ts`
- `frontend/tests/api-remarcacoes-negocio.spec.ts`
- Documentação em `docs/testes/`.

Nenhum push, deploy ou alteração remota foi realizado.
