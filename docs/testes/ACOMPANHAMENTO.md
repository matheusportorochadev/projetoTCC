# Acompanhamento da implementação de testes

## Escopo e situação

A missão completa permanece em andamento. Este documento registra a auditoria inicial e a primeira expansão, sem declarar cobertura integral das baterias A–L.

## Fase 1 — auditoria

Os oito arquivos originais foram preservados: 10 testes Chromium e 20 testes HTTP reais. Execuções iniciais aprovadas: interface 10/10 (6,6 s), integração 20/20 (6,7 s). Backend `typecheck` e frontend `build` aprovados.

A integração não reutiliza servidores existentes e inicia o backend por `dev:test`. A interface original simula somente `/perfil` nos testes de proteção de rotas. As três contas fictícias autenticaram com sucesso, confirmando sua disponibilidade funcional; o seed não foi executado.

Lacunas identificadas: leitura duplicada e parcial do arquivo de credenciais; ausência de consulta ao banco efetivo no inicializador; evidências fora do `.gitignore`; limites clínicos compartilhados por IP. Existem muitas alterações anteriores do usuário, preservadas.

## Proteção de dados

`backend/scripts/protecao-banco-testes.mjs` centraliza a validação para o inicializador, seed e fixtures. Exige `NODE_ENV=test`, URL local com banco exatamente `tcc_consultorio_testes` e confirmação por `SELECT current_database()` no PostgreSQL antes das escritas. Falha de conexão bloqueia a execução. Não imprime URL ou senha. O cliente psql usa parâmetros de ambiente para evitar credenciais nos argumentos.

O banco efetivo foi confirmado como `tcc_consultorio_testes`. Nenhuma migração, recriação, limpeza geral ou seed foi realizada. As autenticações escrevem auditorias fictícias; as fixtures criam contas/médicos/pacientes/credenciais e prontuários próprios, removidos por identidade aleatória e IDs exatos em transação. As três contas originais permanecem preservadas. Não há ações remotas ou AWS.

## Fase 2 — expansão clínica inicial

| Arquivo | Novos testes | Cobertura |
| --- | ---: | --- |
| `frontend/tests/api-prontuarios-validacao.spec.ts` | 5 | Senha curta, sem maiúscula, minúscula, número e especial; estado da credencial preservado; ausência de cookie clínico |
| `frontend/tests/api-prontuarios-fluxos.spec.ts` | 5 | Senha incorreta; desbloqueio/cookie/logout; revogação por versão; dois registros independentes e histórico; isolamento entre médicos |
| `frontend/tests/api-login-validacao.spec.ts` | 6 | JSON vazio, obrigatoriedade, e-mail inválido, tipos incorretos e campos extras |
| `frontend/tests/api-seguranca-http.spec.ts` | 8 | Helmet, CORS permitido/bloqueado, preflight e CSRF em quatro métodos |

Fixtures clínicas possuem credencial pré-configurada por bcrypt para testar desbloqueio sem consumir a rota limitada de cadastro. Isso não cobre o cadastro válido pela API. Revogação é exercitada alterando a versão da fixture; o fluxo completo de redefinição ainda precisa de testes próprios.

Os primeiros quatro fluxos clínicos e as cinco validações passaram com os 20 originais: 29/29 (18,6 s). A execução consolidada posterior acrescenta senha incorreta e os testes HTTP/login; consultar o resultado final registrado abaixo.

Problemas corrigidos na infraestrutura nova: fechamento explícito `db.close()` para o subprocesso não permanecer aberto; limpeza individual por ID para respeitar a cardinalidade do ORM. Uma fixture do teste de histórico cuja limpeza falhou foi removida explicitamente após a correção. Esses erros eram da infraestrutura de teste, não defeitos demonstrados da aplicação.

## Execução

Na pasta `frontend`:

```sh
npm run test:all
```

Executa TypeScript do backend, build do frontend, interface e integração em sequência, interrompendo em falha. Os comandos separados permanecem disponíveis. PostgreSQL local deve estar acessível e o psql deve estar no PATH ou no caminho do Postgres.app utilizado pelo projeto.

Relatórios HTML: `frontend/playwright-report/` e `frontend/playwright-report-integration/`. Screenshots da interface e traces são retidos em falhas. Diretórios de evidências são ignorados pelo Git. Traces HTTP podem conter corpos de requisição e cookies: são artefatos locais privados, não devem ser publicados como relatório acadêmico ou enviados a serviços remotos.

Não há dependências novas. O helper de credenciais usa `node:util.parseEnv` e caminho relativo ao próprio módulo, substituindo os quatro leitores duplicados originais.

## Pendências e plano de continuidade

1. Concluir fase 2: cadastro clínico válido/duplicado/confirmação, JWT adulterado/expirado/finalidade/usuário/sessão, novo login, desativação, recuperação com SMTP simulado, códigos expirados/reutilizados e auditorias. Isolar instâncias para testes que excedam cinco requisições por IP; não relaxar limites.
2. Autenticação/autorização: expiração/claims JWT, enumeração, contas bloqueadas/excluídas, primeiro acesso, recuperação e permissões de escrita.
3. Médicos/pacientes: CRUD, unicidade, bloqueios, reativação e vínculos com fixtures independentes.
4. Agenda/agendamentos: ler estados reais e cobrir transições, cancelamento, remarcação, conflitos e concorrência controlada.
5. Segurança/auditoria: rate limits em instância separada, erros JSON/tamanho, privacidade, filtros e paginação.
6. Interface: jornadas autenticadas, calendário, prontuários, desktop/tablet/mobile e temas. Os dez testes atuais continuam sendo cobertura inicial, não jornadas completas.
7. Consolidar repetibilidade de toda a expansão, matriz por cenário e proposta de CI com banco exclusivo. Nenhum workflow remoto/deployment foi configurado.

Foi reproduzida a falha SEG-01: autorização clínica reapresentada após logout continua aceita. Causa, reprodução, gravidade condicionada e proposta estão em `SEGURANCA-LOGOUT.md`. A expectativa do teste foi preservada; a correção sensível aguarda aprovação. Cenários pendentes não foram avaliados integralmente. Recuperação por e-mail não foi chamada, portanto nenhum e-mail real foi enviado pelos testes novos.

## Última execução consolidada

`npm run test:all`: TypeScript backend aprovado; build frontend aprovado; interface **10 aprovados, 0 reprovados, 0 ignorados (6,9 s)**; integração **47 aprovados, 1 reprovado, 0 ignorados (32,3 s)**. Total Playwright: **58 testes, 57 aprovados, 1 reprovado, 0 ignorados**. Os 30 originais estão preservados e aprovados. O comando retorna erro por causa da regressão SEG-01, como deve ocorrer.

Arquivo adicional `api-prontuarios-cadastro-isolado.spec.ts`: quatro testes de cadastro inicial/duplicado/desbloqueio, confirmação divergente/campos extras, revogação após logout e limite de cadastro. Cada caso inicia processo próprio com a mesma proteção do banco e encerra o processo ao terminar. Três aprovados e um reprovado por defeito da aplicação. O cadastro usa senha clínica aleatória compatível com o schema; não pressupõe que a senha inicial de login satisfaça a política clínica.

Outros arquivos criados/alterados nesta expansão: `backend/scripts/protecao-banco-testes.mjs`, `iniciar-backend-testes.mjs`, `criar-usuarios-teste.ts`, `fixture-clinica.ts`; `frontend/tests/helpers/credenciais.ts`, `fixture-clinica.ts`, `api-isolada.ts`; quatro arquivos originais de API apenas para centralizar a leitura de senha; `frontend/package.json` e `.gitignore`. O guard também impede conexão herdada que divirja de `.env.test`; o inicializador encaminha sinais para encerrar seu subprocesso.

Fase 1 concluída para a infraestrutura e baseline auditados. Fase 2 permanece parcial, com defeito de revogação identificado. As fases restantes não estão concluídas. Não existe relatório final de conclusão da missão.

SEG-01 foi confirmado em nova execução isolada: 1 teste reprovado (3,1 s), novamente HTTP 200 após logout. Esse último comando substitui o relatório HTML de integração pelo caso isolado; os totais completos acima correspondem à execução consolidada anterior. A fixture identificada da execução interrompida também passou pela limpeza restrita após o fechamento correto das conexões.

## Correção autorizada de SEG-01 — concluída em 22/10/2026

O usuário autorizou a revogação persistida com aplicação de esquema exclusiva no banco de testes. A correção foi implementada, sem mudar a expectativa do teste original. O relatório técnico e a lista de arquivos estão em [CORRECAO-REVOGACAO-SESSOES.md](CORRECAO-REVOGACAO-SESSOES.md). O procedimento futuro do banco principal está separado em [MIGRACAO-SESSOES-PRINCIPAL.md](MIGRACAO-SESSOES-PRINCIPAL.md), não executado.

Resultado atual de `npm run test:all`: **81 aprovados, zero reprovados, zero ignorados** (8 backend, 16 interface, 57 integração); TypeScript e build aprovados. Os 30 originais continuam aprovados. A falha de revogação que bloqueava a etapa anterior está corrigida. Outras sessões são preservadas; reapresentar cookies antigos é bloqueado inclusive após reinicialização. O frontend também trata falha do logout sem anunciar saída.

Banco efetivo utilizado: `tcc_consultorio_testes`, validado antes de migração/fixtures. Foram adicionados somente tabela de revogações e dois índices; o planejamento posterior não tem operações pendentes. Revogações das fixtures são limpas somente por sua identidade própria. O banco principal não recebeu migrações ou alterações de dados, e não houve serviço remoto, push ou deploy.

As pendências de recuperação clínica com SMTP simulado, demais cenários de prontuário e fases 3–8 permanecem abertas; a missão geral não é declarada concluída por esta correção.

## Auditoria principal e expansão de negócio — 22/10/2026

A auditoria solicitada da migração foi concluída sem aplicar DDL no principal: consultas de metadados em READ ONLY conferiram 15 tabelas/122 colunas, defaults, índices, chaves, checks de enum e assinatura anterior. Backup, reversão e implantação têm procedimento documentado; nenhum backup ou restauração foi executado. Ver [AUDITORIA-MIGRACAO-SESSOES.md](AUDITORIA-MIGRACAO-SESSOES.md).

Foram acrescentados **92 testes HTTP de regras de negócio**, preservando os 81 anteriores e suas expectativas. Resultado consolidado: **173 executados, 170 aprovados, 3 reprovados, zero ignorados**. Interface: 16/16; backend: 8/8; integração: 146/149. TypeScript backend, TypeScript estrito dos testes e build frontend aprovados.

Por fase: médicos 21/21; pacientes 21 aprovados e uma falha de unicidade normalizada de CPF; disponibilidade 20/20; agendamentos/remarcações/concorrência 27 aprovados e duas falhas (data passada e erro 500 em disputa de slot). Os 81 anteriores continuam aprovados, incluindo revogação persistida após reinício. Não foram alteradas regras da aplicação para mudar o resultado dos novos testes.

A preparação/limpeza transacional usa grupos de usuários fictícios exclusivos em `tcc_consultorio_testes`, com validação efetiva da conexão antes de cada operação. A conferência final encontrou zero contas das novas fixtures restantes. Eventos de login inválido sem usuário permanecem na auditoria, sem exclusão genérica. Não foram solicitados envios de email.

Arquivos, resultados acumulados, diferenças entre falhas da fixture e do sistema, cobertura e próximas etapas estão em [EXPANSAO-REGRAS-NEGOCIO.md](EXPANSAO-REGRAS-NEGOCIO.md). Causas e propostas para NEG-01/02/03 estão em [DEFEITOS-REGRAS-NEGOCIO.md](DEFEITOS-REGRAS-NEGOCIO.md). Essas três correções permanecem pendentes; a missão geral não está concluída.


## Correção de NEG-01, NEG-02 e NEG-03 — resultado atualizado

Os três defeitos foram corrigidos na origem, preservando os 173 testes e suas expectativas. Foram acrescentados cinco casos para legado/atualização/concorrência de CPF e rejeição de datas passadas na solicitação e remarcação. `npm run test:all` encerrou com código 0: **178 aprovados, zero reprovados, zero ignorados** (8 backend, 16 interface, 154 integração). Typecheck do backend e dos testes e build do frontend aprovados. Nenhuma migração, alteração do banco principal ou ação remota foi realizada nesta correção. A migração principal da revogação continua separada e não autorizada. Detalhes e arquivos: [CORRECAO-DEFEITOS-REGRAS-NEGOCIO.md](CORRECAO-DEFEITOS-REGRAS-NEGOCIO.md).


## Continuação efetiva dos testes pendentes — 22/10/2026

Esta etapa acrescentou **110 casos**, preservando os **178 anteriores**, sem novas dependências. O objetivo foi implementar lacunas do planejamento, não repetir apenas a bateria anterior. A matriz inicial foi criada antes dos novos testes e atualizada após a validação: [MATRIZ-COBERTURA-PENDENTE.md](MATRIZ-COBERTURA-PENDENTE.md).

### Prioridade 1 — primeiro acesso e recuperação

**44 novos: 40 aprovados, quatro reprovados, zero ignorados.** Arquivos: `api-primeiro-acesso.spec.ts` (17), `api-recuperacao-senha.spec.ts` (15), `api-recuperacao-clinica.spec.ts` (12).

Cobertura: médicos/pacientes elegíveis, flags e senha inicial, normalização do email no primeiro acesso, senha fraca/confirmada incorretamente com código válido, códigos errados/expirados/de outro usuário/reutilizados, cinco tentativas por código onde implementadas, reenvio, limite real de envio, login após criação/redefinição, rejeição da senha antiga, auditoria da troca, destinatário clínico derivado da sessão, revogação da autorização clínica por versão e preservação da senha principal. SMTP local simulado por protocolo, sem relay, permite validar envio real do Nodemailer e falha/retomada de transporte sem mensagem externa.

As quatro reprovações são reais: sessão principal antiga permanece válida após reset (SEG-02), e o mesmo código é aceito duas vezes simultaneamente em cada um dos três fluxos (COD-01/02/03). Reuso sequencial funciona; a corrida só é detectada pelos novos casos. Não houve alteração dos serviços de credenciais para facilitar testes.

Infraestrutura criada/alterada: `frontend/tests/helpers/recuperacao.ts`, `smtp-local.ts`, `api-isolada.ts`, `negocio.ts`, `credenciais.ts` e `backend/scripts/fixture-negocio.ts`. Chaves JWT dos casos adversariais são efêmeras por instância; códigos ficam apenas na caixa local em memória. Fixtures confirmam banco efetivo antes de alterações em contas/códigos fictícios e não retornam hashes/códigos brutos na inspeção.

Pendências: correção autorizada dos quatro defeitos, avaliação de enumeração sob falha SMTP/por tempo, todos os limites exatos de validade, isolamento entre finalidades de códigos e recuperação diante de outras falhas parciais. O reset principal tem limite por IP, mas não contador por código no modelo atual; essa proteção não foi inventada.

### Prioridade 2 — auditorias e rastreabilidade

**26 novos, todos aprovados.** Arquivo: `frontend/tests/api-auditorias.spec.ts`.

Quatro módulos existentes (`login`, `pacientes`, `agenda`, `prontuarios`): visitante 401, médico/paciente 403, acesso ADMIN, identificação do responsável, instantes/resultados, login/logout/falha, cadastro de paciente, disponibilidade/consulta e operações clínicas. Pacientes recebem fixture sintética de 61 eventos para conferir páginas 50+11, contadores, filtros combinados, ordem estável, página vazia e isolamento por médico. O módulo clínico administrativo é verificado contra allowlist de metadados, sem conteúdo sensível. Eventos de criação/redefinição de senhas são verificados nos fluxos de credenciais. `LOGIN_BLOQUEADO` é verificado também no novo teste do limite de login.

Não existe auditoria de médicos a testar. Nem toda operação de paciente emite um evento atualmente: não se criaram expectativas para ações inexistentes. Permanecem pendentes páginas profundas em todos os módulos e eventual ampliação funcional dos eventos, mediante decisão própria.

### Prioridade 3 — jornadas reais e responsividade

**20 novos, todos aprovados.** Arquivos: `frontend/tests/jornadas-reais.spec.ts` (18) e `remarcacao-real.spec.ts` (2). Com os 16 anteriores: **36/36**.

ADMIN: login real, filtros/paginação de auditoria nos três tamanhos, cadastro visual de médico, bloqueio e reativação. MÉDICO: cadastro/pesquisa/edição de paciente nos três tamanhos, senha clínica e dois prontuários com carregamento do anterior e preservação do histórico, configuração de disponibilidade nos três tamanhos, confirmação/recusa/remarcação/cancelamento e troca de sessão com isolamento. PACIENTE: calendário, modal dentro da tela e interação durante rolagem, solicitação PENDENTE, confirmação, cancelamento e logout; remarcação com troca real para o médico aceitar/recusar e retorno para acompanhar o resultado.

Viewports: 1440×1000, 820×1180 e 390×844 em Chromium. O celular configura agenda pelo calendário/modal, conforme a implementação; o formulário lateral oculto não é utilizado pelo teste. Temas disponíveis e menus móveis são exercitados. Não se apresenta isso como cobertura de contraste/acessibilidade completa ou Firefox/WebKit.

`frontend/tests/helpers/interface-real.ts` encaminha HTTP ao backend real da própria fixture, preservando origem pública/cookies/CORS. Não simula respostas da API. O teardown fecha páginas antes de terminar o backend e anexa screenshot em falhas, sem propagar erro de transporte com headers. Um erro inicial expôs somente um JWT fictício nos detalhes do proxy; sua conta/instância foram encerradas e a sanitização foi corrigida. O log final contém zero JWTs serializados.

### Prioridade 4 — segurança complementar

**20 novos: 18 aprovados, dois reprovados.** Arquivo: `frontend/tests/api-seguranca-complementar.spec.ts`.

JWTs principal e clínico com assinatura válida antes da mutação, expiração, nbf, emissor, audiência, perfil/sub, finalidade e vínculo; IDs manipulados; parser e tamanho de corpo; 11ª falha de login com 429/auditoria, preservando sessão administrativa independente. Limites são testados em instâncias próprias, sem desativar controles normais.

HTTP-01 e HTTP-02 são defeitos reais: JSON malformado retorna 500 em vez de 400; corpo maior que 10 KB retorna 500 em vez de 413. A rejeição do corpo e a ausência de stack na resposta são preservadas, e o servidor continua disponível. O handler global não foi alterado nesta expansão. Revogação após logout, concorrência da agenda, CPF e datas passadas continuam aprovados.

### Prioridade 5 — infraestrutura e lint

O script `backend/src/scripts/testar-integracao-prontuario.ts` usa agora UUID/IDs da própria fixture, confirma banco efetivo e fecha o cliente/limpa registros em `finally`. Passou nos 14 checks originais, sem alterar expectativas. O script de criptografia passou nos seis checks. Ambos são executados por `backend/package.json` → `test:scripts` e não são duplicados na contagem dos 288 casos.

Os **14 erros e três avisos de lint foram resolvidos** sem desabilitar regras. Arquivos de aplicação ajustados: `Agenda.tsx`, `Pacientes.tsx`, `Prontuarios.tsx`, `FormularioProntuario.tsx`, `PainelClinicoProntuarios.tsx`, `AgendarConsulta.tsx` e `MeusAgendamentos.tsx`. Alterações restritas a carregamento por continuações das respostas HTTP, callbacks/dependências, reset do formulário por identidade React e reset de seleção no evento de navegação. Não há temporizadores artificiais nem mudança das regras de negócio. Dois specs antigos tiveram apenas o parâmetro vazio de fixtures substituído por uma fixture nomeada; não mudaram expectativas.

`frontend/scripts/testar-tudo.mjs` substitui o encadeamento que parava na primeira falha: executa oito verificações, inclui scripts e lint, registra tempos/códigos em `frontend/test-results-resumo.json` e termina com erro se alguma verificação reprovar. Cancelamento fica identificado e sinalizado aos filhos. `frontend/.gitignore` ignora o resumo; relatórios/evidências continuam ignorados. Scripts de frontend/backend foram atualizados; nenhuma dependência foi instalada.

Durante desenvolvimento, execuções focadas foram interrompidas para corrigir seletores e o fluxo móvel. Elas não são contadas como consolidação. Uma API de testes residual foi identificada por PID/linha `.env.test` e encerrada individualmente; a configuração `reuseExistingServer=false` permaneceu intacta. A conferência pós-execução também identificou uma fixture fictícia residual da interrupção, tratada exclusivamente pelo UUID e helper de limpeza, sem exclusões globais. Cancelamentos forçados continuam exigindo esse cuidado; execuções normais concluem a limpeza em `finally`.

### Consolidação final

Execução concluída em **22/10/2026 às 17:42:11 UTC / 14:42:11 America/Sao_Paulo**, com `cancelado=false`:

| Conjunto | Executados | Aprovados | Reprovados | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| 178 anteriores | 178 | 178 | 0 | 0 |
| 110 novos | 110 | 104 | 6 | 0 |
| **Total** | **288** | **282** | **6** | **0** |

Por executor: oito testes backend aprovados; interface **36/36** em **114,449 s**; integração **238/244**, seis reprovações em **443,683 s**; zero instáveis. Typecheck backend, typecheck dos testes, lint (zero erros/avisos), build frontend e dois scripts avulsos aprovados. Tempo agregado dos oito processos: **572,627 s**. `npm run test:all` retorna **1**, corretamente, por seis regressões reais.

O relatório HTML de interface fica em `frontend/playwright-report/`; API em `frontend/playwright-report-integration/`; resumo em `frontend/test-results-resumo.json`. Baterias focadas durante desenvolvimento não são somadas novamente. O relatório anterior de 178 continua sendo registro histórico, não o resultado desta expansão.

Causas, impactos e propostas: [DEFEITOS-COBERTURA-PENDENTE.md](DEFEITOS-COBERTURA-PENDENTE.md). Nenhuma correção sensível de segurança, migração, operação no banco principal, push ou deploy foi aplicada. A missão integral permanece em andamento, com lacunas e itens não aplicáveis discriminados na matriz. Próxima decisão: consumo atômico dos códigos e revogação por alteração de senha, preservando os testes reprovados.


Conferência final somente leitura: **zero contas residuais da família `negocio.*` e três contas fictícias originais preservadas**. A única fixture residual da interrupção foi identificada pelo UUID `827e732c-87ed-4367-8a48-72ec2dcea596` e pelo evento de 22/10/2026 às 14:24:49; sua remoção usou exclusivamente o helper transacional de limpeza desse UUID. Não houve exclusão geral. Nenhuma API permaneceu escutando na porta 3000 ao fim da consolidação. Relatórios/resumo estão ignorados pelo Git; documentação e log final foram conferidos sem JWTs serializados.


## Correção autorizada dos seis defeitos — 22/10/2026

Resultado confirmado: **294 executados e aprovados, zero reprovados/ignorados/instáveis**, incluindo todos os 288 anteriores. Backend 11/11; interface 36/36; API 247/247. Seis novos casos complementares: três rollbacks reais após escrita de credencial e três cenários de sessões/cookies/reinício/compatibilidade/concorrência com senhas distintas. Expectativas anteriores preservadas.

SEG-02 foi corrigido com `Usuario.versaoSessao`, claim no login e comparação na consulta de usuário já existente. Reset incrementa a geração com a senha e consumo de códigos na mesma transação; bloqueia tokens antigos e acesso clínico após reinício, preservando outros usuários. Logout individual permanece inalterado. COD-01/02/03 agora bloqueiam a linha do usuário e revalidam códigos dentro da transação ORM 8, mantendo expiração, contagem de tentativas e rollback. HTTP-01/02 agora respondem 400/413 sem registrar o corpo do parser, mantendo 10 KB e todas as proteções.

Arquivos desta etapa e procedimentos estão em [CORRECAO-SEIS-DEFEITOS.md](CORRECAO-SEIS-DEFEITOS.md). TypeScript backend/testes, lint (zero erros/avisos), build frontend e scripts avulsos passaram. `test:all` retornou 0 após oito verificações (584,429 s), finalizadas às 18:15:12 UTC. Focados: dez regressões/concorrência aprovados, três HTTP complementares aprovados e 11 backend aprovados; não somados duas vezes ao consolidado.

A migração aditiva de uma coluna foi aplicada **somente** em `tcc_consultorio_testes`, após revisão do plano e confirmação efetiva. Contratos e snapshot foram gerados pelo CLI instalado. O executor exclusivo permite somente a operação dessa coluna; não contém URL/segredos. Principal e produção não receberam consultas, dados ou migrações nesta etapa. O procedimento futuro de backup, aplicação e reversão está separado no relatório e exige nova autorização. Não houve push/deploy.

Conferência final READ ONLY: nenhuma conta residual das famílias `negocio.*`/`clinica.*`, três contas originais preservadas na geração zero; coluna `integer NOT NULL DEFAULT 0`. Amostra local de 12 consultas: p50 1,497 ms/p95 2,382 ms, com duas consultas por requisição como antes. Não foi feita carga pesada.

Problemas corrigidos na infraestrutura desta etapa: o novo teste manual de cookie clínico passou a enviar também o novo cookie principal, sem mudar a expectativa 403. Tentativas bloqueadas pelo sandbox não chegaram aos testes e foram repetidas com acesso local autorizado, mantendo o guard. Nenhum defeito adicional foi demonstrado. Permanecem as lacunas do planejamento A–L da matriz; esta correção dos seis defeitos está concluída, sem declarar cobertura integral do TCC.


## Consolidação técnica, Git e nova produção — 22/10/2026

Orientação atual: não priorizar atualização do banco principal local. A produção será nova/vazia na AWS. Antes dessa alteração de prioridade houve somente leitura de catálogos do principal, em READ ONLY com ROLLBACK; nenhum registro de aplicação foi lido/copiado/alterado. Nenhuma migração local principal ou ação remota foi executada.

**30 testes novos**, sem substituir os 294: 22 API (14 integridade clínica, três paginações, cinco códigos/perfis/normalização) e oito UI (cinco credenciais, três numeração/responsividade). Arquivos e cobertura detalhados na [MATRIZ-COBERTURA-PENDENTE.md](MATRIZ-COBERTURA-PENDENTE.md).

Consolidação final às **19:33:45 UTC / 16:33:45 America/Sao_Paulo**: **324 executados, 323 aprovados, um reprovado, zero ignorados/instáveis**. Anteriores: 294/294; novos: 29/30. Backend 11/11, UI 43/44, API 269/269. Typechecks, lint, build e scripts adicionais passaram. Tempo agregado 677,144 s; `test:all` retornou 1 somente por UI-PA-01 e concluiu todas as oito verificações, sem cancelamento.

UI-PA-01: reenvio de primeiro acesso espera `apto` ausente na resposta genérica, abandona o formulário apesar de novo código enviado. Teste mantido sem skip; causa e patch revisável não aplicado em [DEFEITOS-CONSOLIDACAO.md](DEFEITOS-CONSOLIDACAO.md). Autorização da correção visual foi solicitada e continua pendente; não se alterou a API anti-enumeração ou qualquer regra sensível para obter aprovação.

Infraestrutura segura: fixtures próprias para paginação dos demais módulos, alteração de perfil sintética e instância por caso clínico, sem enfraquecer limites. Primeiro ajuste de seletores/rotas/origem da UI corrigiu erros dos novos testes, não da aplicação. `VITE_API_URL` centralizou 15 consumidores mantendo o padrão local; Vite de testes passou a processo exclusivo em 5174, sem reuse e com API local explícita. Origem adicional somente nos processos isolados; `.env` reais e proteções normais preservados. A consolidação foi repetida após esse ajuste para validar a configuração final, sem somar contagens.

Bootstrap efetivo: banco adicional `tcc_consultorio_bootstrap_validacao_20261022`, autorizado como descartável, começou vazio e recebeu o contrato completo com 74 operações aditivas. Resultado: 16 tabelas, 61 índices, 13 FKs, assinatura atual, zero registros de aplicação. Reexecução: zero operações/diferenças. Banco preservado para inspeção, sem DROP. Contratos gerados reproduzidos identicamente e grafo de migrações aprovado. Plano/variáveis/limitações: [PLANO-PRODUCAO-AWS.md](PLANO-PRODUCAO-AWS.md).

Git: `.gitignore` raiz e lista explícita de candidatos, sem staging/commit/descarte. Encontrado `backend/cookies.txt` já rastreado com JWT expirado, sem divulgar valor; tratamento do rastreamento/histórico requer revisão. Backups/snapshots não referenciados e mudanças antigas preservados para revisão, sem exclusão automática. `git diff --check` passou. Ver [AUDITORIA-ARQUIVOS-GIT.md](AUDITORIA-ARQUIVOS-GIT.md).

Conferência final READ ONLY: zero contas residuais `negocio.*`/`clinica.*`, três originais preservadas na geração zero, API 3000 e Vite de teste 5174 encerrados. Nenhuma chave/senha alterada ou email externo enviado. Relatório final desta etapa: [RELATORIO-CONSOLIDACAO-TCC.md](RELATORIO-CONSOLIDACAO-TCC.md). A fase está documentada com bloqueio legítimo de UI e achado no Git; não se declara versão pronta para publicar nem cobertura completa do TCC.


## 22/10/2026 — validação final de primeiro acesso e segurança Git

- Reenvio visual corrigido conforme patch autorizado; cinco testes relacionados aprovados.
- Validação consolidada: **330/330 aprovados**, zero falhas/ignorados; 324 anteriores preservados e seis testes novos do scanner. Nove etapas concluídas em 712,991 s, incluindo build, tipos, lint e scripts adicionais.
- Cookie temporário removido apenas do índice; cópia local preservada e ignorada. JWT expirado continua no histórico; evidência local de push anterior não determina visibilidade remota.
- Scanner atual/staged, política específica, testes e hook local implementados. Auditoria: 20 ocorrências fictícias/exemplos, nenhum bloqueio atual; uma ocorrência histórica expirada. Sem reescrita, commit ou push.
- Escritas somente em `tcc_consultorio_testes`; conferência final confirmou limpeza das fixtures verificadas e três contas fictícias preservadas. Principal intocado, sem migrações.
- Relatório e riscos residuais: `VALIDACAO-FINAL-SEGURANCA-GIT.md`. Proposta explícita de arquivos: `ARQUIVOS-PROPOSTA-COMMIT.txt`; exclusão staged do cookie deve ser mantida separadamente. Categorias ainda pendentes continuam na matriz.
