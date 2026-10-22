# Consolidação do TCC — 22/10/2026

**Atualização posterior:** UI-PA-01 recebeu autorização e foi corrigido; o cookie temporário saiu do índice com cópia local preservada. Este documento mantém os resultados históricos 323/324. Resultado atual e auditoria: [VALIDACAO-FINAL-SEGURANCA-GIT.md](VALIDACAO-FINAL-SEGURANCA-GIT.md).


Execução final concluída em **22/10/2026 às 19:33:45 UTC / 16:33:45 America/Sao_Paulo**: **324 executados, 323 aprovados, um reprovado, zero ignorados e zero instáveis**. Os **294 anteriores passaram**; entre os **30 novos**, 29 passaram e um reproduziu defeito real. Nenhum teste foi excluído, duplicado na contagem, marcado como falha esperada ou teve expectativa relaxada.

| Conjunto | Executados | Aprovados | Reprovados | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| Backend | 11 | 11 | 0 | 0 |
| Interface Chromium | 44 | 43 | 1 | 0 |
| Integração HTTP | 269 | 269 | 0 | 0 |
| **Total** | **324** | **323** | **1** | **0** |

`npm run test:all` retornou **1**, corretamente, pela única falha visual. Concluiu as oito etapas com `cancelado=false`, prosseguindo até o fim da integração. O pipeline **não está verde** e não se declara a versão pronta para publicação.

## Execuções e verificações

| Pasta/comando | Resultado | Tempo do processo |
| --- | --- | ---: |
| backend `npm run typecheck` | Aprovado | 2,562 s |
| backend `npm run test:sessions` | 11 aprovados | 5,733 s |
| backend `npm run test:scripts` | Dois scripts aprovados (6 +14 checks) | 1,980 s |
| frontend `npm run test:typecheck` | Aprovado | 0,997 s |
| frontend `npm run lint` | Zero erros/avisos | 4,074 s |
| frontend `npm run build` | Aprovado | 2,114 s |
| frontend `npm run test:e2e` | 43 aprovados, um defeito real | 148,664 s |
| frontend `npm run test:integration` | 269 aprovados | 511,020 s |

Tempo agregado dos oito processos: **677,144 s** (11 min 17,1 s). Tempos internos Playwright: UI **148,229 s**, API **510,456 s**, não somados novamente. Os dois scripts avulsos são evidências adicionais, não mais 20 casos artificiais no total de 324.

Descoberta por `--list`: UI 44 em oito arquivos, API 269 em 26 arquivos; backend 11 em um arquivo. Todas as suítes configuradas estão no executor. `test:e2e:ui` é o mesmo conjunto em modo interativo. Não há arquivo de casos atual fora das suítes inventariadas. Helpers/fixtures e scripts de manutenção não são contados como casos autônomos.

Baterias direcionadas durante desenvolvimento: 22 novos API passaram após isolar o limiter; três jornadas de credenciais com seletores corrigidos passaram; a bateria UI na porta exclusiva teve sete novos aprovados e uma falha real. A primeira consolidação completa também teve 323/324 e foi repetida **somente porque a configuração pública da API exigiu fixar um Vite exclusivo para evitar herdar endereço de outro ambiente**. Não somar execuções ou repetir contagem de casos.

Verificações adicionais: `migration check` sem falhas; `contract emit` offline reproduziu JSON/types byte a byte idênticos; `npm ls --depth=0` sem dependência declarada ausente (um pacote local extraneous preservado); `git diff --check` aprovado. Build com `VITE_API_URL=https://api.producao.example/` passou e incorporou a URL fictícia, sem acesso a esse endereço. O build final do consolidado voltou ao padrão local; um build real de produção exige configuração explícita.

Evidências locais privadas: `frontend/playwright-report/`, `frontend/playwright-report-integration/`, `frontend/test-results-resumo.json`, log `/private/tmp/tcc-consolidacao-final.log`. Relatórios retêm screenshot da falha; novos casos sensíveis desativam trace de requisições. Artefatos são ignorados pelo Git e não devem ser publicados com cookies/códigos. O log final foi conferido sem JWT serializado.

## Trabalho efetivo

- Auditoria de contratos/catálogos, sem alteração no principal; após a mudança de prioridade, produção nova/vazia passou a ser o foco.
- Inicialização limpa em banco descartável independente, sem registros reais; contrato completo e repetibilidade validados.
- Expansão de segurança clínica, códigos, mudança de perfil, normalização de email, três paginações administrativas, jornadas de credenciais e numeração por paciente nos três tamanhos.
- Centralização de 15 pontos do frontend em `VITE_API_URL`, preservando o padrão local e as proteções. Build com URL fictícia aplicado sem chamada externa.
- Organização do Git por regras de ignore, revisão e lista explícita, sem staging/commit/descarte. Há um cookie rastreado expirado para tratamento manual.

## Cobertura e arquivos

Os novos casos estão nos cinco arquivos listados na matriz: `api-clinicos-integridade.spec.ts` (14), `api-auditorias-paginacao.spec.ts` (3), `api-recuperacao-isolamento.spec.ts` (5), `recuperacao-visual.spec.ts` (5), `historico-numeracao.spec.ts` (3). Não houve alteração de expectativas dos 294 anteriores; dois arquivos de jornadas antigas passaram a navegar pela base da configuração isolada.

Fixtures/helpers: `backend/scripts/fixture-negocio.ts`, `frontend/tests/helpers/negocio.ts`, `interface-real.ts`, `api-isolada.ts` e navegações de `jornadas-reais.spec.ts`/`remarcacao-real.spec.ts`, sem modificar asserções. Backend novo: `scripts/validar-banco-vazio.mjs`. Frontend: `src/config/api.ts`, importações dos 15 consumidores, `.env.example`. Playwright usa Vite próprio na porta 5174, sem reuse, com `VITE_API_URL` fixada na API local. Navegações dos testes são relativas a esse servidor; a origem adicional é permitida somente nas APIs isoladas de teste. O servidor de desenvolvimento existente foi preservado. Removidos somente espaços finais de três linhas em dois arquivos já modificados; nenhum arquivo foi excluído.

Documentos: `AUDITORIA-ARQUIVOS-GIT.md`, `ARQUIVOS-PROPOSTA-COMMIT.txt`, `PLANO-MIGRACAO-BANCO-PRINCIPAL.md` (prioridade substituída), `PLANO-PRODUCAO-AWS.md`, `DEFEITOS-CONSOLIDACAO.md`, este relatório, acompanhamento e matriz. A lista de commit inclui alterações anteriores necessárias e identifica a revisão manual de mudanças cuja autoria não se pode deduzir do diff.

## Bancos e migrações

`migration check` do CLI instalado passou sem falhas. Nenhuma migração/contrato foi alterado nesta consolidação. O banco de testes já está no contrato `262d9014…`; regras de CPF/datas/concorrência e sessões permanecem incorporadas. O principal só recebeu leitura de metadados antes da nova prioridade, com sessão/transação READ ONLY e ROLLBACK; não houve consulta de registros, cópia, backup, restauração ou escrita.

Bootstrap: `tcc_consultorio_bootstrap_validacao_20261022`, criado para a exceção explícita de validação do banco vazio. Zero tabelas antes; 74 operações aditivas; depois 16 tabelas, 61 índices, 13 FKs, assinatura atual e zero registros de aplicação. Segunda execução: zero operações e zero diferenças. Preservado para inspeção; não foi executado DROP. Não há migração do principal planejada como requisito da futura produção nova.

## Defeitos e revisão de segurança

UI-PA-01: o reenvio de primeiro acesso exige `apto` inexistente na resposta genérica e abandona o formulário de código após envio 200. Teste mantido, causa/proposta e pedido de autorização registrados em `DEFEITOS-CONSOLIDACAO.md`. Não acrescentar campo de elegibilidade à API como solução, pois isso enfraqueceria anti-enumeração.

Git: `backend/cookies.txt` já rastreado contém JWT expirado; nenhum valor foi exibido. O ignore não remove arquivos rastreados. Não houve remoção ou reescrita do histórico. A varredura dos arquivos atuais não certifica todo o histórico; a versão não deve ser declarada livre de material de autenticação até tratamento desse achado.

Causas de falhas de desenvolvimento corrigidas nos testes: compartilhamento indevido do limite clínico, origem local errada, seletor de email e destino inicial do médico. Sem alteração de permissões, cookies, limites ou validações. A versão final deve distinguir essas tentativas das falhas reais, sem somá-las novamente.

## Git e futuro commit

Nenhum add/commit/push; índice vazio, 55 arquivos rastreados modificados e 101 novos não ignorados. A lista proposta tem 151 caminhos (inclui mudanças anteriores necessárias), com os demais reservados para revisão manual. Proposta explícita em `ARQUIVOS-PROPOSTA-COMMIT.txt`; mensagem sugerida `test: consolidar cobertura, seguranca e bootstrap reproduzivel`. Segredos, evidências, dumps e temporários ficam fora da proposta; cookie e backup já rastreados requerem revisão própria. Preservar snapshots referenciados e contratos gerados. `git diff --check` passou após correção pontual de whitespace.

## Antes da AWS

Plano e variáveis em `PLANO-PRODUCAO-AWS.md`, com fontes oficiais sobre RDS/TLS e segredos no ECS. Não houve deploy nem alteração remota. Nenhum dos dois bancos locais existentes foi migrado nesta consolidação; somente o descartável recebeu inicialização de estrutura. Pendências: achados atuais, aprovação de infraestrutura, TLS real do driver, IAM mínimo, administrador inicial, backup/recuperação, rotação da chave clínica, readiness, proxy e armazenamento de limites em múltiplas instâncias. A missão geral de cobertura A–L continua parcial, conforme matriz; não foi declarada concluída por uma contagem de testes.


## Conferência final de dados e pendências

Depois da suíte, o guard confirmou efetivamente `tcc_consultorio_testes`/`NODE_ENV=test`. Consultas READ ONLY encontraram zero contas `negocio.*` e zero `clinica.*`, três contas fictícias originais preservadas na geração zero e coluna `integer NOT NULL DEFAULT 0`. Não houve seed ou limpeza global; somente preparação/alteração/limpeza por IDs próprios das fixtures. Auditorias anônimas não atribuíveis à fixture não foram excluídas globalmente. API 3000 e Vite de testes 5174 encerraram; o Vite de desenvolvimento em 5173 foi preservado.

A correção de UI-PA-01 continua aguardando resposta explícita ao pedido de autorização. Patch concreto não aplicado: [PROPOSTA-REENVIO-PRIMEIRO-ACESSO.patch](PROPOSTA-REENVIO-PRIMEIRO-ACESSO.patch). Próximos passos: revisar/aprovar esse ajuste, revalidar sua jornada e o conjunto afetado, tratar o cookie rastreado e revisar a lista de commit. Nenhum commit/push/deploy ou alteração do principal foi executado. A cobertura integral A–L permanece em andamento, sem promessa de prontidão AWS antes das condições do plano técnico.
