# Correção dos seis defeitos — 22/10/2026

Escopo autorizado: SEG-02, COD-01/02/03 e HTTP-01/02. Os 288 casos anteriores e suas expectativas foram preservados. Não foram executadas escritas, consultas ou migrações no banco principal nesta correção. Não houve push, deploy, email externo ou mudança nas regras de médicos, pacientes, agendas e prontuários.

## Causas e correções

| Defeito | Causa | Correção |
| --- | --- | --- |
| SEG-02: JWT anterior ao reset continua autorizado | A revogação persistida identifica somente tokens encerrados por logout; trocar bcrypt não alterava a autorização dos demais tokens | `Usuario.versaoSessao`, inicialmente zero; login inclui essa geração no JWT assinado. Reset incrementa a geração na mesma transação da senha e dos códigos. O middleware compara com o usuário atual |
| COD-01: primeiro acesso concorrente | Elegibilidade/código eram lidos antes do bcrypt, sem bloqueio; duas conclusões atualizavam a conta | Transação ORM 8 com `SELECT ... FOR UPDATE` da linha do usuário antes de reler elegibilidade e código; senha, flags e consumo dos códigos no mesmo commit |
| COD-02: reset principal concorrente | Leitura do código e alteração da senha eram operações separadas | Mesmo bloqueio por usuário, releitura e consumo transacional, incluindo incremento da versão de sessão |
| COD-03: recuperação clínica concorrente | A transação existente começava depois da validação; o update não exigia exclusividade | Bloqueio/releitura antes da validação; senha clínica, versão de autorização e consumo no mesmo commit |
| HTTP-01: JSON inválido retorna 500 | Handler global tratava o erro conhecido do parser como erro interno | Mapeamento central de `entity.parse.failed` com status 400 para resposta genérica 400 |
| HTTP-02: corpo grande retorna 500 | Mesmo tratamento genérico para `entity.too.large` | Mapeamento central do erro com status 413 para resposta genérica 413; limite original **10 KB preservado** |

O bloqueio é do PostgreSQL, não um mutex em memória: funciona entre processos. A segunda conclusão aguarda a primeira transação e lê novamente o estado confirmado; recebe 400, sem trocar a credencial nem registrar novo sucesso. O usuário é a chave comum dos três fluxos. Os parâmetros SQL são vinculados pelo `db.raw.sql` do contrato atual, sem concatenação de entrada do cliente. Não foi introduzido PrismaClient convencional nem nova dependência.

Os helpers de invalidação recebem o contexto da transação, evitando escritas fora dela. Expiração e tentativas máximas permanecem. Nos caminhos de código errado/expirado, o callback retorna um erro de domínio como resultado: o commit preserva a contagem/invalidação e só depois o serviço lança a mensagem pública. Uma falha de persistência lança dentro da transação e desfaz senha, versão e consumo. A auditoria de sucesso continua após o commit, com a política anterior de melhor esforço.

Os erros reconhecidos do parser são tratados antes do log de erro interno: o objeto pode conter corpo com senha e não é registrado. Respostas têm somente `mensagem`, sem stack ou corpo rejeitado. CORS/CSRF/Helmet, cookies HttpOnly, JWT/jti, limites e perfis continuam ativos.

## Sessões existentes e compatibilidade

- A redefinição bem-sucedida encerra todas as sessões anteriores **daquela conta**, inclusive outra sessão independente. O logout continua encerrando somente a sessão atual por hash persistido em `SessaoRevogada`.
- Outros usuários mantêm suas sessões. Novo login com a senha nova recebe a geração atual.
- Tokens com jti, mas sem o novo claim, representam a geração zero: continuam aceitos enquanto o usuário estiver na geração zero e são rejeitados após seu primeiro reset. JWT sem jti continua rejeitado conforme a proteção anterior.
- Não se depende de `iat`/resolução em segundos, cache ou memória do processo. A geração está no PostgreSQL; reiniciar não desfaz a revogação.
- O router clínico valida a sessão principal antes da autorização adicional. Reapresentar ambos os cookies antigos recebe 401; combinar o login novo com autorização clínica antiga recebe 403 pelo vínculo entre sessões. Recuperação **clínica** mantém o login principal e incrementa somente a autorização clínica, como antes.
- Requisições já autorizadas antes do commit não são retroativamente canceladas. Verificações posteriores consultam a geração confirmada.

## Estrutura de banco e aplicação futura no principal

Aplicada **somente em `tcc_consultorio_testes`**, após `NODE_ENV=test`, comparação com `.env.test`, host local e `SELECT current_database()` efetivo. O executor guardado permite exclusivamente a operação aditiva `column.public.usuario.versaoSessao`. O plano foi revisado antes de aplicar.

```sql
ALTER TABLE "public"."usuario"
  ADD COLUMN "versaoSessao" int4 DEFAULT 0 NOT NULL;
```

A migração não exclui registros, reescreve senhas/CPFs, limpa dados, copia registros reais ou incrementa versões existentes. As linhas existentes começam em zero. Contratos gerados pelo CLI instalado do Prisma 8:

- Origem: `8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02`.
- Destino: `262d9014fd79fd6570d42e23c5c465a2c6afc07dc6a0627f78d6387e4ef74e67`.
- Pacote: `backend/migrations/app/20261022T1758_versao_sessao_senha/` (SQL em `ops.json`, implementação tipada, metadados e snapshot).
- Executor exclusivo de testes: `backend/scripts/aplicar-versao-sessao-testes.mjs` (sem argumento: plano; `--apply`: aplica somente após guard e allowlist). Não usar esse executor no principal; ele o bloqueia.

**Procedimento futuro, condicionado a nova autorização e não executado:**

1. Revisar [MIGRACAO-SESSOES-PRINCIPAL.md](MIGRACAO-SESSOES-PRINCIPAL.md) e [AUDITORIA-MIGRACAO-SESSOES.md](AUDITORIA-MIGRACAO-SESSOES.md). O principal pode ainda estar no contrato anterior à tabela de revogações: não presumir que a primeira migração já existe.
2. Providenciar backup consistente por `pg_dump` no procedimento de manutenção autorizado, com acesso restrito e credenciais fora de argumentos/logs. Verificar catálogo do arquivo e ensaiar restauração em banco temporário separado, sem copiar dados reais para o banco automatizado de testes. Registrar ponto de retorno. Nenhum backup de dados reais foi feito nesta etapa.
3. Confirmar conexão e metadados efetivos do ambiente autorizado. Revisar o plano `db update --to <hash-destino-acima> --dry-run --no-interactive` com conexão configurada cuidadosamente, sem imprimir segredos. Aprovar apenas a coluna acima e, se ainda pendentes, a tabela e os dois índices da primeira correção. Não executar baseline de recriação.
4. Em janela controlada, aplicar pelo CLI instalado, preservando a assinatura do contrato Prisma 8; SQL isolado não atualiza essa assinatura. A alteração exige lock de DDL: usar timeout de lock e interromper/replanejar se não o obtiver. O default constante é compatível com a estratégia aditiva do PostgreSQL atual; avaliar volume/versão efetivos do principal antes de implantação.
5. Parar todas as instâncias antigas antes de disponibilizar o backend corrigido, para que nenhuma ignore a geração durante a transição. Disponibilizar juntos código e contratos novos após a estrutura estar pronta. Fazer smoke controlado autorizado, sem rodar fixtures com escrita no principal.
6. Conferir assinatura, coluna/default/not-null e monitorar erros/latência. Não zerar versões nem remover revogações para contornar falhas.

**Reversão:** antes de ativar o código, uma coluna aditiva ociosa pode permanecer sem risco funcional. Depois de resets confirmados, voltar ao middleware antigo pode reautorizar cookies comprometidos. Não fazer downgrade ingênuo, diminuir versões ou apagar a coluna/tabela. Suspender acesso e corrigir adiante mantendo as verificações; uma reversão operacional completa requer plano e autorização próprios, preservando revogações e senhas mais recentes. Restaurar backup pode desfazer alterações legítimas posteriores; nunca restaurá-lo automaticamente sobre o principal. Nenhum SQL destrutivo de reversão foi executado ou automatizado.

## Arquivos desta correção

- `backend/src/services/auth.service.ts`: geração no JWT.
- `backend/src/middlewares/auth.middleware.ts`: comparação com geração persistida, antes de autorizar qualquer rota protegida.
- `backend/src/services/primeiroAcesso.service.ts`, `redefinicaoSenha.service.ts`, `prontuario-recuperacao.service.ts`: bloqueio, releitura e transação completa.
- `backend/src/server.ts`: classificação dos dois erros conhecidos do parser.
- `backend/src/prisma/contract.prisma`, `contract.json`, `contract.d.ts`: campo e contratos gerados.
- `backend/migrations/app/20261022T1758_versao_sessao_senha/`, snapshot `262d9014…`, `backend/migrations/app/refs/db.json`: plano/assinatura de testes.
- `backend/scripts/aplicar-versao-sessao-testes.mjs`: plano/aplicação exclusivos do banco isolado.
- `backend/tests/sessoes-falhas.test.mjs`: três casos acrescentados, sem modificar os oito anteriores.
- `frontend/tests/api-redefinicao-sessoes.spec.ts`: três casos novos.
- `frontend/tests/helpers/recuperacao.ts`: reinício controlado da API isolada preservando chave efêmera/SMTP local.
- `docs/testes/CORRECAO-SEIS-DEFEITOS.md`, `ACOMPANHAMENTO.md`, `MATRIZ-COBERTURA-PENDENTE.md`, `DEFEITOS-COBERTURA-PENDENTE.md` e aviso complementar em `MIGRACAO-SESSOES-PRINCIPAL.md`.

## Validação e desempenho

Bateria focada: dez aprovados em 24,9 s, incluindo os seis regressões e quatro casos de concorrência de negócio já existentes. Complementares HTTP: três aprovados em 14,8 s. Backend: oito anteriores e três rollbacks reais, 11 aprovados em 6,38 s. Essas baterias não são somadas novamente ao total consolidado.

Os rollbacks injetam falha depois que o update da credencial retorna dentro da transação real. Confirmam restauração de senha, flags/versões e disponibilidade do código nos três fluxos, com limpeza apenas dos IDs da fixture. O complemento de concorrência usa senhas distintas e verifica que só a vencedora autentica e que existe uma única auditoria de sucesso.

Uma tentativa do novo caso clínico inicialmente omitia o cookie principal no header manual e recebeu 401. O teste foi corrigido para enviar o login novo junto ao cookie clínico antigo, preservando a expectativa 403. Bloqueios de sandbox ao PostgreSQL impediram tentativas iniciais antes de qualquer teste; as execuções válidas usaram a permissão local necessária, mantendo o guard intacto.

A consulta autenticada continua com **uma busca indexada de revogação por hash e uma busca de usuário**, comprovadas pelo teste anterior preservado. A geração aproveita a segunda busca e acrescenta um inteiro; não há consulta nova por requisição, nem varredura de sessões, cache ou trabalho de limpeza. No reset, o lock permanece durante bcrypt/commit; outras alterações da mesma conta podem aguardar, mas contas diferentes usam linhas diferentes. Limites de requisição reduzem abuso. Isso não substitui benchmark em produção; nenhum teste de carga pesada foi executado.

### Resultado consolidado confirmado

`npm run test:all` terminou com código **0** em **22/10/2026 às 18:15:12 UTC / 15:15:12 America/Sao_Paulo**, com oito verificações, nenhuma falha e cancelamento `false`.

| Suíte | Descobertos/executados | Aprovados | Reprovados | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| Backend node:test | 11 | 11 | 0 | 0 |
| Interface Chromium | 36 | 36 | 0 | 0 |
| Integração HTTP | 247 | 247 | 0 | 0 |
| **Total** | **294** | **294** | **0** | **0** |

Os **288 anteriores passaram**, incluindo os seis casos antes reprovados. Foram acrescentados apenas seis casos complementares: três rollbacks e três cenários HTTP. Nenhum teste instável ou não executado apareceu nos relatórios. Os dois scripts avulsos passaram em seus seis e 14 checks, contabilizados separadamente, sem inflar os 294 casos.

| Verificação/comando | Resultado | Tempo do processo |
| --- | --- | ---: |
| Backend `npm run typecheck` | Aprovado | 2,606 s |
| Backend `npm run test:sessions` | 11 aprovados | 5,744 s |
| Backend `npm run test:scripts` | Ambos aprovados | 1,988 s |
| Frontend `npm run test:typecheck` | Aprovado | 0,977 s |
| Frontend `npm run lint` | Zero erros/avisos | 4,171 s |
| Frontend `npm run build` | Aprovado | 2,147 s |
| Frontend `npm run test:e2e` | 36 aprovados | 118,870 s |
| Frontend `npm run test:integration` | 247 aprovados | 447,926 s |

Tempo agregado dos oito processos: **584,429 s** (9 min 44,4 s). Os relatórios Playwright mediram 118,428 s para interface e 447,380 s para API; são tempos internos desses processos, não novas execuções a somar.

Além do consolidado, comandos focados executados na pasta frontend:

```sh
npm run test:integration -- --grep 'simultâne|Redefinir senha invalida|JSON malformado|Corpo acima'
npm run test:integration -- tests/api-redefinicao-sessoes.spec.ts
```

A estrutura foi emitida/planejada offline pelo CLI local com `contract emit` e `migration plan --from 8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02 --name versao_sessao_senha`. Plano e aplicação no teste usaram `NODE_ENV=test node --env-file=.env.test scripts/aplicar-versao-sessao-testes.mjs`, sem argumento e depois `--apply`. Nenhuma conexão do principal foi utilizada.

Evidências locais ignoradas pelo Git: `frontend/playwright-report/`, `frontend/playwright-report-integration/` e `frontend/test-results-resumo.json`. Log local da consolidação: `/private/tmp/tcc-correcao-seis-completa.log`; conferido sem JWT serializado. Não publicar artefatos de requests que possam conter cookies/códigos.

A amostra de 12 consultas autenticadas do teste anterior de latência passou: **p50 1,497 ms, p95 2,382 ms**, sem carga concorrente. A asserção estrutural anterior de duas consultas também passou. A amostra é local e pequena, sem alegação de ganho estatístico ou capacidade de produção.

Conferência final READ ONLY, após guard efetivo: **zero contas `negocio.*` e zero contas `clinica.*` residuais**, três contas fictícias originais preservadas, todas na geração zero. A coluna é `integer NOT NULL DEFAULT 0`. Não havia backend escutando em 3000 após o encerramento. As únicas alterações de dados foram preparação, operações e limpeza por identidade das fixtures fictícias no banco de testes; auditorias anônimas anteriores não foram apagadas globalmente.

Os seis defeitos estão corrigidos e não houve regressão detectada nesta suíte. As limitações de cobertura abaixo permanecem, sem novos defeitos demonstrados nesta correção.

## Pendências fora das seis correções

As lacunas de cobertura A–L documentadas na matriz permanecem: mais navegadores/acessibilidade, limites adicionais de campos/IDs, falhas simuladas de outros serviços e possível enumeração sob falha SMTP/tempo. Não são declaradas corrigidas nesta entrega. Não foi inventado contador de tentativas por código no reset principal, que mantém os limites HTTP existentes. A implantação no principal permanece pendente de nova autorização.
