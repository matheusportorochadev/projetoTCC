# Relatório de execução completa dos testes do TCC

## Identificação e conclusão

Execução: **TCC-20261022-154811Z**, em 22/10/2026. Inventário iniciado às 15:45:59 UTC (12:45:59 em America/Sao_Paulo). Comandos principais executados de 15:48:11 a 15:52:20 UTC. Relatório consolidado em 22/10/2026 às 13:02:30 -03 (16:02:30 UTC).

**As suítes configuradas repetiram a referência: 178 testes descobertos, 178 executados, 178 aprovados, zero reprovados, zero ignorados e zero não executados nessas suítes.** Não foram adicionados testes, alteradas expectativas ou aplicadas correções.

A auditoria ampliada encontrou ainda **dois scripts de teste fora dessas suítes**: criptografia aprovada (seis verificações internas); integração legada iniciada, mas reprovada na primeira pré-condição por depender de IDs fixos ausentes no banco isolado. O restante desse script não pôde ser executado. Além disso, **lint reprovado: 14 erros e três avisos**. Portanto, o conjunto de verificações do projeto não está integralmente aprovado, apesar de os 178 testes continuarem verdes.

Os scripts avulsos são apresentados separadamente, sem transformar cada assert em um teste novo. O inventário contém **22 arquivos de suítes com 178 casos, mais dois scripts avulsos**; os dois scripts foram iniciados, com um aprovado e um reprovado/bloqueado por pré-condição. Não há omissão silenciosa do script legado.

## Segurança do ambiente

Projeto: `/Users/matheusrocha/Documents/tcc-consultorio`. Node v22.23.2 e npm 10.9.8.

O guarda `backend/scripts/protecao-banco-testes.mjs` foi revisado: exige `NODE_ENV=test`, correspondência da conexão com `.env.test`, host local, banco exatamente `tcc_consultorio_testes` e confirmação efetiva por `SELECT current_database()`. A execução de `test:sessions`, os inicializadores e as fixtures usam essa proteção. A confirmação efetiva foi obtida com sucesso, inclusive antes do script legado.

Somente fixtures e auditorias fictícias das suítes existentes receberam escritas no banco de testes, com sua limpeza própria por identidade/ID. O seed não foi executado. Nenhuma migração, alteração do banco principal, limpeza geral, instalação de dependências, publicação, push ou operação remota foi realizada.

O script legado não possui guarda próprio e referencia IDs do antigo ambiente de desenvolvimento. Para iniciá-lo com segurança, um wrapper temporário fora do repositório validou primeiro o banco efetivo e acrescentou **`default_transaction_read_only=on` à conexão exclusiva desse processo**, antes de importar o cliente. O destino PostgreSQL permaneceu o mesmo. Nenhum `.env` foi alterado. O script falhou na primeira consulta de pré-condição, antes de criar prontuários ou auditorias. Não se criaram contas artificiais com os IDs fixos para forçar uma aprovação.

Hashes SHA-256 dos arquivos de código e configuração foram comparados antes/depois: **nenhum desses arquivos foi alterado**. O único arquivo persistente produzido no repositório nesta etapa é este relatório, além dos artefatos de execução/build já previstos e ignorados pelo Git. Nenhuma senha, JWT, chave de criptografia ou URL com credenciais foi incluída neste documento.

## Descoberta e seleção dos testes

Foram examinados os dois `package.json`, ambas as configurações Playwright, `tsconfig.tests.json`, a configuração ESLint, os executores/fixtures e os documentos anteriores em `docs/testes`, em especial o relatório da correção dos três defeitos e o acompanhamento.

- `frontend/playwright.config.ts`: `testDir=tests`; ignora `**/api-*.spec.ts`; um worker; Chromium Desktop Chrome; 16 casos em quatro arquivos. Não há projetos mobile, tablet, Firefox ou WebKit configurados.
- `frontend/playwright.integration.config.ts`: seleciona `**/api-*.spec.ts`; um worker; 154 casos em 17 arquivos; backend iniciado por `dev:test`; `reuseExistingServer=false`, impedindo uso acidental de um servidor de desenvolvimento.
- `backend/tests/sessoes-falhas.test.mjs`: oito casos executados pelo runner nativo `node:test` via `test:sessions`.
- Não foram encontrados outros arquivos `.spec`/`.test`, configurações Jest/Vitest ou outros pacotes de testes no código do repositório, excluindo dependências e relatórios gerados. Os quatro módulos `frontend/tests/helpers/` são auxiliares importados pelos casos, não suítes independentes.
- Nenhum caso usa `test.skip`, `test.fixme` ou seleção exclusiva `test.only`/`describe.only` nos arquivos inventariados. Os relatórios confirmam zero ignorados e zero instáveis; não há retries configurados.

`test:all` inclui backend typecheck, oito testes de sessão, typecheck dos testes, build, interface e integração. **Não inclui lint nem os dois scripts `backend/src/scripts/testar-*.ts`.** `test:e2e:ui` é o modo interativo da mesma suíte, não uma suíte adicional. Seed e comandos de planejamento/aplicação de migração não são testes e não foram executados. Não existe script de lint ou build separado no backend; o typecheck existente foi executado.

Os comandos foram executados separadamente para que uma falha, como a do lint, não impedisse as suítes seguintes.

## Comandos e tempos

Também foram executados `rg --files` e buscas de inventário, `node --version`, `npm --version`, `npm ls --depth=0` em ambos os pacotes, `git check-ignore` para evidências e:

```sh
# frontend — descoberta sem execução
npm run test:e2e -- --list
npm run test:integration -- --list
```

| Pasta | Comando | Código de saída | Tempo do processo |
| --- | --- | ---: | ---: |
| `backend` | `npm run typecheck` | 0 | 2.903 s |
| `backend` | `npm run test:sessions` | 0 | 0.878 s |
| `frontend` | `npm run test:typecheck` | 0 | 0.872 s |
| `frontend` | `npm run build` | 0 | 2.150 s |
| `frontend` | `npm run lint` | 1 | 4.605 s |
| `frontend` | `npm run test:e2e` | 0 | 8.661 s |
| `frontend` | `npm run test:integration` | 0 | 229.083 s |

Comandos adicionais:

```sh
# backend — script em memória, sem escrita no banco
NODE_ENV=test node --env-file=.env.test --import tsx src/scripts/testar-criptografia-prontuario.ts

# backend — wrapper temporário com guarda e conexão somente leitura
NODE_ENV=test node --env-file=.env.test --import tsx /private/tmp/tcc-execucao-completa/legado.mts

# frontend — diagnóstico estruturado da mesma falha de lint, sem --fix
npm run lint -- --format json --output-file /private/tmp/tcc-execucao-completa/lint.json
```

O wrapper temporário somente configura segurança e encerramento do cliente; importa o arquivo original e mantém seus IDs, verificações e expectativas. Não executar diretamente o script legado com a configuração de desenvolvimento.

Tempo somado dos sete comandos principais, incluindo build, tipos e lint: **249.152 s** (aproximadamente 4 min 9 s). Esse total mede os processos completos, inclusive inicialização/encerramento. Os scripts avulsos e o segundo diagnóstico de lint não tiveram duração individual cronometrada; não se atribui a eles tempo zero. O intervalo de auditoria até a consolidação inclui inspeção e autorizações de execução, além dos processos de teste.

## Resultado por suíte e arquivo

| Suíte | Descobertos | Executados | Aprovados | Reprovados | Ignorados | Não executados | Tempo do runner |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Backend — sessões/falhas simuladas | 8 | 8 | 8 | 0 | 0 | 0 | 0,750 s |
| Interface Chromium | 16 | 16 | 16 | 0 | 0 | 0 | 0 | 8,219 s |
| Integração HTTP | 154 | 154 | 154 | 0 | 0 | 0 | 0 | 228,650 s |
| **Total comparável à referência** | **178** | **178** | **178** | **0** | **0** | **0** | — |

| Arquivo | Casos aprovados / descobertos |
| --- | ---: |
| `backend/tests/sessoes-falhas.test.mjs` | 8 / 8 |
| `frontend/tests/inicio.spec.ts` | 1 / 1 |
| `frontend/tests/login.spec.ts` | 3 / 3 |
| `frontend/tests/logout.spec.ts` | 6 / 6 |
| `frontend/tests/rotas-protegidas.spec.ts` | 6 / 6 |
| `frontend/tests/api-agendamentos-negocio.spec.ts` | 18 / 18 |
| `frontend/tests/api-autenticacao.spec.ts` | 2 / 2 |
| `frontend/tests/api-concorrencia-negocio.spec.ts` | 4 / 4 |
| `frontend/tests/api-disponibilidade-negocio.spec.ts` | 20 / 20 |
| `frontend/tests/api-login-perfis.spec.ts` | 3 / 3 |
| `frontend/tests/api-login-validacao.spec.ts` | 6 / 6 |
| `frontend/tests/api-medicos-negocio.spec.ts` | 21 / 21 |
| `frontend/tests/api-pacientes-negocio.spec.ts` | 25 / 25 |
| `frontend/tests/api-permissoes.spec.ts` | 6 / 6 |
| `frontend/tests/api-prontuarios-acesso.spec.ts` | 5 / 5 |
| `frontend/tests/api-prontuarios-cadastro-isolado.spec.ts` | 4 / 4 |
| `frontend/tests/api-prontuarios-fluxos.spec.ts` | 5 / 5 |
| `frontend/tests/api-prontuarios-seguranca.spec.ts` | 4 / 4 |
| `frontend/tests/api-prontuarios-validacao.spec.ts` | 5 / 5 |
| `frontend/tests/api-remarcacoes-negocio.spec.ts` | 9 / 9 |
| `frontend/tests/api-seguranca-http.spec.ts` | 8 / 8 |
| `frontend/tests/api-sessoes-revogacao.spec.ts` | 9 / 9 |

| Script avulso não incluído em `test:all` | Resultado | Verificações internas |
| --- | --- | --- |
| `backend/src/scripts/testar-criptografia-prontuario.ts` | Aprovado, saída 0 | Seis verificações aprovadas: formato, ausência de texto puro, recuperação, IV aleatório, contexto de outro médico e adulteração |
| `backend/src/scripts/testar-integracao-prontuario.ts` | Reprovado na pré-condição, saída 1 | Uma verificação executada/reprovada; 13 verificações posteriores não alcançadas |

As verificações internas dos scripts não são somadas aos 178 casos registrados pelos runners. O único fluxo adicional que não pôde ser concluído é o script legado. Não houve teste existente ignorado ou ajustado para contornar essa falha.

## Cobertura por categoria e lacunas

- **Interface e navegação:** 16 casos aprovados, incluindo página inicial, formulário de login, proteção de seis rotas e logout dos três perfis com sucesso/503. Parte usa respostas simuladas; não representa jornadas completas com backend real.
- **Login, JWT e autorização:** autenticação real dos três perfis, ausência/token inválido, permissões 401/403, validações de entrada e bloqueio/reativação aprovados. A existência de JWT não significa que todas as variantes de expiração/issuer/audience tenham testes específicos; não foram encontrados cenários dedicados para todas essas combinações.
- **Logout e revogação:** repetição dos cookies antigos, independência de sessões, repetição/concorrência, reinicialização real do backend, falhas simuladas de persistência e quantidade de consultas aprovadas.
- **HTTP e abuso:** Helmet, sniffing/framing, CORS, credenciais, preflight e CSRF aprovados. O limite da sexta tentativa de cadastro clínico é testado em instância isolada; não há cobertura completa de todos os limitadores.
- **Prontuários:** senha adicional, validações, cadastro duplicado, desbloqueio, cookie e prazo, senha incorreta, revogação por versão, isolamento entre médicos e histórico independente aprovados. Criptografia avulsa também aprovada.
- **Médicos:** 21 casos aprovados, incluindo cadastro, validações, duplicidades, bloqueio, reativação, sessões, restrições por perfil e exclusão com/sem vínculos.
- **Pacientes e CPF:** 25 casos aprovados; CRUD permitido, vínculo, isolamento, acesso, sincronização, bloqueio/reativação, CPF com/sem máscara, legado, atualização e concorrência.
- **Disponibilidade:** 20 casos aprovados; períodos, duração, slots, sobreposição, viradas de mês/ano, autorização, edição, desativação e rollback de lote.
- **Agendamentos:** 18 casos aprovados; solicitação, confirmação, recusa, cancelamento, históricos, datas inválidas/passadas, bloqueio do médico e isolamento.
- **Remarcação:** nove casos aprovados; solicitação, reserva, aceite/recusa, liberação de horários, autorização e data passada.
- **Concorrência:** quatro casos aprovados; disputa de slots, confirmações, remarcações e cadastros únicos, sem duplicação/orfandade nos cenários observados.
- **Primeiro acesso:** há verificações de flags e liberação da conta em cadastros. Não há suíte existente do fluxo completo de códigos, recuperação de senha ou SMTP simulado. Nenhum teste foi inventado para preencher essa lacuna nesta etapa.
- **Auditorias:** operações reais exercitam os serviços e há verificação simulada de que falha de logout não audita sucesso. As verificações diretas de auditoria do script legado não foram alcançadas. Não há suíte dedicada de auditoria administrativa, filtros, paginação ou privacidade das respostas de auditoria.
- **Responsividade:** não existem testes específicos mobile/tablet ou asserções dedicadas de responsividade. O único projeto configurado é desktop Chromium. Não declarar essas categorias aprovadas por inferência.

## Falhas, causas e propostas — nenhuma aplicada

### EXEC-01 — script legado depende de IDs fixos

Classificação: **problema de infraestrutura/dados do teste**, não defeito clínico demonstrado.

Arquivo: `backend/src/scripts/testar-integracao-prontuario.ts`, constantes nas linhas 46–50, consulta nas linhas 120–125 e verificação na linha 127. Resultado esperado: médico ID 16 vinculado ao usuário ID 34. Resultado obtido: registro não encontrado; `FALHOU: Médico e usuário vinculados corretamente`, saída 1. O paciente fixo ID 20 e as etapas de escrita/histórico/auditoria nem chegaram a ser verificados.

Causa provável confirmada pelo código e pela resposta da consulta: dependência de dados de outro ambiente; o arquivo usa `dotenv/config` e não é conectado ao executor/fixtures isolados. Não é uma intermitência observada; é uma pré-condição explícita ausente. Não foi necessário repetir uma tentativa de escrita para demonstrá-la.

Impacto: script fora do pipeline, não repetível e potencialmente perigoso se executado diretamente no ambiente de desenvolvimento. Nenhuma exploração ou alteração no principal ocorreu nesta execução. Os 13 checks posteriores permanecem sem resultado; isso não demonstra que suas funcionalidades falhariam.

Proposta: em etapa aprovada posterior, integrar ao runner seguro, criar identidades fictícias próprias, eliminar IDs fixos, confirmar banco efetivo e garantir encerramento/limpeza por IDs. Não inserir dados com IDs arbitrários no principal nem relaxar a pré-condição.

### EXEC-02 — lint reprovado em componentes e testes

Esperado: código de saída 0, sem erros ESLint. Obtido nas duas execuções diagnósticas: código 1, **14 erros e três avisos**, em nove arquivos. Não houve correção automática.

| Arquivo e localização | Nível | Regra |
| --- | --- | --- |
| `frontend/src/pages/medico/Agenda.tsx:758:10` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/medico/Agenda.tsx:768:12` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/medico/FormularioProntuario.tsx:596:5` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/medico/Pacientes.tsx:176:5` | Erro | `react-hooks/immutability` |
| `frontend/src/pages/medico/Prontuarios.tsx:355:10` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/paciente/AgendarConsulta.tsx:841:10` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/paciente/AgendarConsulta.tsx:843:6` | Aviso | `react-hooks/exhaustive-deps` |
| `frontend/src/pages/paciente/AgendarConsulta.tsx:852:5` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/paciente/AgendarConsulta.tsx:872:6` | Aviso | `react-hooks/exhaustive-deps` |
| `frontend/src/pages/paciente/MeusAgendamentos.tsx:1572:10` | Erro | `react-hooks/set-state-in-effect` |
| `frontend/src/pages/paciente/MeusAgendamentos.tsx:1574:6` | Aviso | `react-hooks/exhaustive-deps` |
| `frontend/tests/api-prontuarios-cadastro-isolado.spec.ts:48:90` | Erro | `no-empty-pattern` |
| `frontend/tests/api-sessoes-revogacao.spec.ts:121:80` | Erro | `no-empty-pattern` |
| `frontend/tests/helpers/negocio.ts:41:23` | Erro | `no-empty-pattern` |
| `frontend/tests/helpers/negocio.ts:43:17` | Erro | `react-hooks/rules-of-hooks` |
| `frontend/tests/helpers/negocio.ts:50:13` | Erro | `react-hooks/rules-of-hooks` |
| `frontend/tests/helpers/negocio.ts:50:13` | Erro | `react-hooks/rules-of-hooks` |

Análise e classificação:

1. **Componentes de produção — oito erros e três avisos:** ESLint aponta alterações de estado em efeitos, referência a `carregarPacientes` antes da declaração e dependências ausentes. São achados estáticos de qualidade/conformidade; não demonstram, por si, uma falha funcional ou vulnerabilidade. Possíveis efeitos: renderizações adicionais e callbacks com dependências desatualizadas. Em particular, a declaração de função pode ser hoisted pelo JavaScript; não se afirma que houve ReferenceError em execução. Proposta: revisar efeitos, inicialização de estado, identidade dos callbacks e dependências caso a caso, com testes das jornadas afetadas antes de alterar comportamento.
2. **Infraestrutura dos testes — seis erros:** três `no-empty-pattern` por destructuring vazio de fixtures e três `rules-of-hooks` sobre o callback Playwright chamado `use`. O callback é uma fixture do Playwright, não um hook React; esses últimos são problemas de escopo da configuração ESLint, que aplica regras de React a todos os `.ts`. Proposta: ajustar a aplicação das regras React aos componentes e tratar padrões de fixtures de forma específica, preservando lint pertinente e sem ignorar testes indiscriminadamente.

Nenhum desses achados foi convertido em defeito real de autorização, CPF ou agenda sem reprodução. As regressões anteriores NEG-01/02/03 e SEG-01 permaneceram aprovadas.

## Dependências, evidências e riscos

`npm ls --depth=0` terminou com código 0 em frontend e backend; não houve dependência obrigatória ausente que impedisse os testes. Frontend: Playwright 1.64.1, TypeScript 6.0.3, Vite 8.3.0. Backend: ORM PostgreSQL 8.0.0-rc.9 e TypeScript 5.9.3. O backend informa `@img/sharp-wasm32@0.35.4` como **extraneous**; não foi removido ou instalado nada. Isso é uma divergência local da árvore de dependências, não evidência de vulnerabilidade. Nenhuma auditoria remota de pacotes foi executada.

Build do frontend, typecheck do backend e typecheck dos testes aprovados. A configuração do typecheck dos testes inclui `tests/**/*.ts` e as duas configurações Playwright. Chromium está instalado e funcional, demonstrado pela execução dos 16 casos. As confirmações do banco e os fluxos HTTP demonstram disponibilidade do PostgreSQL isolado e compatibilidade funcional do contrato utilizado.

Artefatos locais atualizados:

- `frontend/playwright-report/index.html`: 16/16, zero instáveis.
- `frontend/playwright-report-integration/index.html`: 154/154, zero instáveis.
- Logs e metadados temporários em `/private/tmp/tcc-execucao-completa/`, incluindo duração/códigos dos comandos e diagnóstico JSON do lint. Esses arquivos temporários não fazem parte do relatório acadêmico persistente.

Screenshots de falhas e traces seguem as configurações existentes; não houve falha Playwright que exigisse nova evidência visual. Testes que manejam credenciais/cookies mantêm as restrições de trace já implementadas. Os diretórios de relatórios/resultados foram confirmados como ignorados pelo Git. Relatórios brutos de teste devem permanecer locais: traces HTTP podem conter cookies ou corpos de requisições.

Não foi demonstrada nova vulnerabilidade nesta execução. Permanecem riscos de cobertura: recuperação por códigos, expiração completa de JWTs, auditoria administrativa e responsividade. A ausência desses testes não prova que a implementação seja segura ou insegura. O script legado sem guarda é um risco operacional identificado na infraestrutura, neutralizado nesta execução pelo wrapper somente leitura.

## Próxima etapa recomendada

1. Decidir a adequação do script legado ao ambiente isolado e sua inclusão no pipeline, sem IDs fixos e sem escritas fora de fixtures.
2. Revisar os achados de lint, distinguindo problemas de componentes e configuração de fixtures. `test:all` atualmente não detecta essa falha.
3. Planejar, após aprovação, cobertura ausente de recuperação/primeiro acesso completo, auditoria administrativa e responsividade; manter as expectativas dos 178 casos existentes.
4. Manter a migração principal de revogação como decisão separada, sujeita à autorização anterior exigida. Nenhuma ação no principal é necessária para concluir esta auditoria.

**Resultado final:** referência de 178 casos preservada e integralmente aprovada; um script avulso adicional aprovado, outro iniciado mas bloqueado/reprovado por pré-condição; lint reprovado. Somente execução, investigação e documentação foram realizadas.
