# Correção SEG-01 — revogação persistida por sessão

## Causa e solução

O logout anterior apenas removia cookies do navegador. Um cliente que conservasse os dois cookies podia reapresentá-los e acessar a autorização clínica até a expiração: a assinatura, o vínculo com a sessão e a versão clínica continuavam válidos.

A correção mantém JWT HS256, emissor/audiência, expirações, cookies HttpOnly, CSRF, CORS, perfis, limites e segunda senha. Cada login passa a gerar `jti` aleatório com `crypto.randomUUID()`. O logout persiste em PostgreSQL SHA-256 do JWT principal, usuário e expiração; o token original não é armazenado. O `upsert` nativo do contrato do Prisma 8 mantém uma única revogação mesmo com três logouts simultâneos, sem substituir o registro anterior.

O middleware principal verifica revogação por chave primária antes de buscar o usuário. O router clínico executa esse middleware antes da segunda autenticação, portanto uma sessão principal revogada bloqueia automaticamente o token clínico que lhe estava vinculado. Outra sessão do mesmo usuário continua válida. A persistência é consultada em cada processo, sem cache que reautorize tokens após reinicialização.

JWTs antigos sem `jti` exigem novo login. A verificação do usuário no banco continua detectando desativação, primeiro acesso e mudança de perfil. Requisições já autorizadas e em andamento antes do logout não são canceladas retroativamente.

## Falhas e integração com a interface

Se a leitura de revogação falhar, a API retorna 503 sem autorizar acesso. Se a escrita falhar, o logout retorna 503 sem informar sucesso nem apagar cookies necessários para repetir a operação. Erros internos não são expostos ao cliente. Cookies ausentes/expirados/inválidos continuam podendo ser removidos.

A interface de ADMIN, MEDICO e PACIENTE antes redirecionava para login em um `finally`, mesmo diante de erro de logout. O ajuste acoplado à correção mostra alerta e mantém a tela e dados locais em falha; após confirmação do backend, limpa dados locais e navega para login. Não altera regras de médicos, pacientes, consultas ou prontuários.

## Banco e migração

Somente `tcc_consultorio_testes` recebeu alterações. O executor verifica `NODE_ENV=test`, correspondência com `.env.test`, host local e `SELECT current_database()`; antes de aplicar, aceita exclusivamente as três operações aditivas previstas no plano. O CLI executou criação da tabela `sessaoRevogada` e dois índices, atualizando a assinatura do contrato.

O banco principal e produção não foram consultados por comandos de migração, alterados ou recriados. Não houve seed, push, deploy ou alteração remota. A migração futura está descrita separadamente em `MIGRACAO-SESSOES-PRINCIPAL.md` e exige nova autorização.

## Arquivos desta correção

| Grupo | Arquivos |
| --- | --- |
| Autenticação | `backend/src/services/sessao.service.ts` (novo), `auth.service.ts`, `backend/src/middlewares/auth.middleware.ts`, `backend/src/controllers/auth.controller.ts` |
| Contratos | `backend/src/prisma/contract.prisma`, `contract.json` e `contract.d.ts` regenerados pelo CLI |
| Migração | `backend/migrations/app/20261022T0544_baseline/`, `20261022T0545_revogacao_sessao_logout/`, snapshot `8dad27...`, ref local `app/refs/db.json` |
| Executor e fixtures | `backend/scripts/aplicar-revogacao-testes.mjs` (novo), `backend/scripts/fixture-clinica.ts` |
| Testes backend | `backend/tests/sessoes-falhas.test.mjs` (novo) |
| Testes Playwright | `frontend/tests/api-sessoes-revogacao.spec.ts` e `logout.spec.ts` (novos); helpers `fixture-clinica.ts` e `api-isolada.ts` |
| Interface | `frontend/src/pages/Admin.tsx`, `frontend/src/layouts/MedicoLayout.tsx` e `PacienteLayout.tsx`, somente fluxo de saída |
| Comandos | `backend/package.json`, `frontend/package.json` |
| Documentação | Este relatório, proposta original atualizada, acompanhamento e procedimento futuro do banco principal |

As alterações que já existiam no repositório foram preservadas. O teste original `Logout invalida no servidor a autorização clínica anteriormente emitida` mantém as expectativas e não foi marcado como ignorado ou falha esperada.

## Testes implementados

Integração real (nove testes): login e logout normal; cookie principal antigo; cookie clínico antigo sem sessão principal; ambos os cookies antigos; outra sessão preservada e token clínico de outra sessão rejeitado; revogação persistente após reinicialização com outra sessão preservada; logout repetido/concorrente com uma única linha de revogação; logout sem token/inválido; medição leve de latência.

Testes com mocks do driver (oito, sem falhas reais no PostgreSQL): leitura indisponível bloqueia com 503; escrita indisponível não confirma logout; uma consulta de revogação por hash; persistência sem JWT em texto; erro do driver não vazado; duas consultas no middleware normal; token legado rejeitado sem consulta; logins no mesmo segundo com identificadores diferentes.

Interface simulada (seis): sucesso e recuperação de erro 503 para cada um dos três perfis. Esses testes verificam o comportamento do React; não substituem a revogação real exercitada pela integração.

Todos os dados de integração pertencem a fixtures aleatórias. A limpeza remove por IDs e identidade exclusiva, incluindo as revogações da própria fixture; não há exclusão ampla de dados de outras execuções. As contas iniciais são preservadas. Testes que manipulam cookies mantêm trace desligado e evidência somente com metadados, para não registrar tokens.

## Comandos

Em `frontend`, `npm run test:all` executa TypeScript backend, testes de falha/sessão, build frontend, interface e integração. Em `backend`, `npm run test:db:plan` visualiza a diferença exclusiva de testes; `npm run test:db:apply` só aplica a migração autorizada ao banco isolado. `npm run test:sessions` executa os oito testes backend.

## Desempenho e limites

A nova consulta é uma busca pela PK `tokenHash`. O middleware normal executa duas consultas: revogação e usuário; antes executava somente usuário. Tokens revogados são barrados após a primeira. Não há varredura de todas as sessões, consultas por cada usuário da lista ou limpeza no caminho das requisições. O teste com mocks confirma a contagem de chamadas; ele não pretende medir viagens de rede internas do driver.

Logout novo faz um `upsert`; em conflito, `update: {}` pode resultar em uma leitura adicional de recarga, conforme o contrato desta versão. Auditoria de logout mantém o comportamento existente. Não há persistência de sessão durante login.

A medição HTTP usa 12 requisições sequenciais a `/perfil` autenticado e não aplica um limiar de tempo frágil. Os resultados são locais; não são benchmark de produção nem teste de carga. Não há medição anterior equivalente para atribuir um custo exato à nova consulta. Retenção de revogações expiradas deve ser definida na operação futura; o índice de expiração já existe, mas nenhuma tarefa automática foi instalada.

## Resultado final

Execução consolidada final de `npm run test:all`, em 22/10/2026:

| Verificação | Aprovados | Reprovados | Ignorados | Tempo |
| --- | ---: | ---: | ---: | --- |
| Testes de sessão/falhas backend | 8 | 0 | 0 | 0,73 s |
| Interface Chromium | 16 | 0 | 0 | 8,57 s |
| Integração HTTP | 57 | 0 | 0 | 59,36 s |
| **Total de testes** | **81** | **0** | **0** | — |

TypeScript backend e build frontend aprovados. Os 30 cenários originais continuam presentes e aprovados. O teste SEG-01 mantém exatamente `expect([401, 403]).toContain(repeticao.status())`. O novo arquivo de integração foi executado com as demais suítes; não há falhas intermitentes ou retries registrados nos relatórios desta execução.

Medição local de `/perfil`: 12 amostras sequenciais, p50 **1,79 ms**, p95 **2,71 ms**. Esse resultado confirma funcionamento leve no ambiente local desta execução; não mede o custo incremental frente à versão anterior nem substitui avaliação de produção.

`npm run test:db:plan` após aplicação: **zero operações pendentes**. `prisma migration check` offline: todos os checks aprovados. Não houve modificação no banco principal. Relatórios HTML: `frontend/playwright-report/index.html` e `frontend/playwright-report-integration/index.html`.

As demais baterias da missão original continuam com as pendências registradas no acompanhamento; esta entrega conclui especificamente a correção autorizada da revogação.
