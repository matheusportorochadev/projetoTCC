# Auditoria de migração e expansão de regras de negócio — 22/10/2026

## Auditoria anterior à expansão

A [auditoria da migração de sessões](AUDITORIA-MIGRACAO-SESSOES.md) revisou SQL, estrutura efetiva, assinatura anterior, impacto nos JWTs, backup, reversão e implantação. A conexão principal foi utilizada somente para metadados em transação READ ONLY; dados de negócio não foram consultados. O SQL permanece aditivo e o banco principal **não foi migrado**.

Foram conferidas 15 tabelas/122 colunas, defaults, 37 índices explícitos, 15 PKs, seis unicidades, 13 FKs e os valores de três CHECKs de enum. Não foram encontradas divergências nas comparações realizadas; a assinatura corresponde ao snapshot anterior. Backup e restauração não foram executados, portanto a auditoria não atesta um backup validado. Reverter para o backend vulnerável não é um plano aceitável de reversão; o documento descreve preservação das revogações e recuperação segura.

## Resultados por fase

Os totais abaixo vêm da execução consolidada. A coluna acumulada soma os testes aprovados da etapa ao baseline de 81, sem contar falhas como aprovações.

| Fase | Novos testes | Aprovados na fase | Reprovados | Aprovados acumulados |
| --- | ---: | ---: | ---: | ---: |
| Baseline preservado/auditoria | 0 | 81 existentes | 0 | 81 |
| Médicos | 21 | 21 | 0 | 102 |
| Pacientes | 22 | 21 | 1 | 123 |
| Disponibilidade | 20 | 20 | 0 | 143 |
| Agendamentos, remarcação e concorrência | 29 | 27 | 2 | 170 |
| **Suíte completa** | **92 novos** | **170 de 173 totais** | **3** | **170** |

Ignorados: **zero**. Todos os 81 testes anteriores passaram e mantiveram suas expectativas, incluindo o teste original SEG-01 e a rejeição de sessões revogadas após reinicialização. O aumento de testes não é apresentado como conclusão de toda a missão original.

### Médicos

`frontend/tests/api-medicos-negocio.spec.ts`: cadastro administrativo com primeiro acesso pendente e resposta sem senha; normalização de nome/email/CRM; duplicidade de email e CRM sem cadastro parcial; oito validações; listagem/detalhe/inexistente; bloqueio que impede login e sessão existente, reativação; exclusão com relacionamentos recusada e exclusão física de médico novo sem dependências; seis tentativas de escrita não autorizada por médico/paciente.

Resultado: **21/21 aprovados**, acumulado lógico de 102. O bloqueio preservando consultas existentes também é exercitado na fase de agendamentos.

### Pacientes

`frontend/tests/api-pacientes-negocio.spec.ts`: cadastro e atualização; validações de nome/email/CPF/telefone/tipos/medicoId; CPF duplicado literal e normalizado; listagem restrita; cinco operações horizontais entre médicos bloqueadas; bloqueio/reativação com vínculo preservado; liberação de acesso criando usuário PACIENTE sem senha e com `primeiroAcesso=true`; email obrigatório para liberação; sincronização de nome/email com usuário e login com novo email; paciente impedido de editar terceiro; exclusão sem histórico.

Resultado: **21 aprovados, 1 reprovado**, acumulado lógico de 123. Defeito NEG-01: CPF com máscara contorna unicidade. A criação do usuário de primeiro acesso não chama SMTP; nenhum código de recuperação ou envio de email foi solicitado.

### Disponibilidade

`frontend/tests/api-disponibilidade-negocio.spec.ts`: lote com datas únicas; dez validações com ausência de escrita parcial; slots completos por duração; sobreposição recusada e adjacência aceita; lote conflitante sem novas disponibilidades; edição; desativação lógica comprovada pela inspeção da própria fixture, com consulta confirmada preservada; isolamento entre médicos e perfis; viradas de mês/ano sem deslocamento de data.

Resultado: **20/20 aprovados**, acumulado lógico de 143. A implementação usa datas explícitas; não foi inventada recorrência semanal ou endpoint novo.

### Agendamentos, remarcações e concorrência

`frontend/tests/api-agendamentos-negocio.spec.ts`: 17 testes, **16 aprovados e 1 reprovado**. Cobre solicitação PENDENTE, confirmação CONFIRMADA, recusa RECUSADA, cancelamento CANCELADA, recuperação de slot, transições inválidas, conflito sequencial, bloqueio/reativação do médico preservando consultas, dados inválidos, proteção por médico/paciente, cadastro manual e preservação de paciente com consulta. NEG-02: paciente agenda em data passada quando há período histórico.

`frontend/tests/api-remarcacoes-negocio.spec.ts`: **8/8 aprovados**. Pedido PENDENTE reserva destino sem alterar consulta; aceite ACEITA atualiza consulta CONFIRMADA; recusa RECUSADA mantém original; visualização repetível após decisão; segundo pedido/decisão repetida bloqueados; cancelamento encerra pedido pendente; remarcação direta; isolamento de médico e paciente; mesmo horário e destino ocupado recusados.

`frontend/tests/api-concorrencia-negocio.spec.ts`: **3 aprovados e 1 reprovado**. Três pares de solicitações simultâneas, dupla confirmação, dois pedidos de remarcação disputando destino e cadastro duplicado concorrente com rollback/sem órfão. NEG-03: a consulta não duplica, mas a requisição perdedora pode receber 500 em vez de 409. Todos os estados utilizados foram lidos do contrato; não há endpoint de conclusão de consulta inventado.

Resultado da fase: **27 aprovados, 2 reprovados**, acumulado lógico de 170. Causas, reprodução e propostas estão em [DEFEITOS-REGRAS-NEGOCIO.md](DEFEITOS-REGRAS-NEGOCIO.md).

## Execuções e verificações

Na consolidação `npm run test:all`: TypeScript backend aprovado, oito testes backend aprovados (~0,69 s), build frontend aprovado, 16 testes de interface aprovados (~8,35 s), **146 testes de integração aprovados e 3 reprovados (~246,18 s)**. Total **173 executados, 170 aprovados, 3 reprovados, nenhum ignorado**. O comando termina com código 1 por defeitos reais, sem marcar falha como esperada.

Também foi criada verificação estrita de tipos de **todos** os testes/configurações Playwright, executada com sucesso por `npm run test:typecheck` e incorporada ao comando `test:all` para as próximas execuções. Não foram instaladas dependências. `prisma migration check` offline continuou aprovado; nenhuma migração foi aplicada nesta etapa, inclusive no banco de testes.

A primeira bateria focada apresentou duas falhas nas fixtures de CRM, por preparação sem a normalização para maiúsculas exigida pelo schema. As fixtures foram corrigidas; os 21 testes de médicos passaram na consolidação. Isso era infraestrutura de teste, não defeito confirmado da aplicação. As três falhas de negócio foram observadas tanto em bateria focada quanto na completa.

Relatórios HTML: `frontend/playwright-report/index.html` e `frontend/playwright-report-integration/index.html`. As novas baterias HTTP manipulam autenticação e usam trace desligado para não gravar cookies/credenciais; evidências de falha incluem erros de asserção e metadados sanitizados. Screenshots/traces dos testes de interface mantêm a configuração anterior. Nenhuma senha, JWT ou CPF real foi incluído nesta documentação.

## Proteção e repetibilidade

`backend/scripts/fixture-negocio.ts` cria em transação um grupo aleatório exclusivo de seis usuários fictícios: administrador, dois médicos e três pacientes. O hash de senha é gerado por bcrypt a partir de `TESTE_SENHA`, nunca impresso. Um backend próprio do worker utiliza as proteções existentes e os rate limits normais; cada papel tem contexto de cookies separado e cada teste recebe seu próprio grupo.

O guard exige `NODE_ENV=test`, URL correspondente a `.env.test`, host local, nome exato `tcc_consultorio_testes` e confirmação do PostgreSQL efetivo. A limpeza roda no `finally`, em transação, por identidade gerada/IDs próprios, incluindo dependências e auditorias vinculadas à fixture. Se encontrar vínculo de usuário fora da identidade esperada, bloqueia a limpeza. Não há TRUNCATE, DROP, limpeza geral, restauração ou seed. As contas iniciais são preservadas. Uma conferência final por SELECT de contagem, em READ ONLY no banco de testes, confirmou **zero usuários `negocio.*` restantes**, inclusive após os cenários que reprovaram.

Eventos de login inválido sem identificação de usuário continuam preservados na auditoria: não há exclusão genérica desses registros para simular banco limpo. Isso é uma limitação deliberada da limpeza segura, não autorização para remover eventos de outras execuções. O fluxo não utiliza emails externos nem chama recuperação de acesso.

Datas futuras usam referência capturada para não mudar se a bateria atravessar meia-noite. Concorrência usa Promise.all e inspeção dos próprios registros, sem sleeps e sem carga pesada.

## Arquivos criados/alterados nesta etapa

Criados: seis arquivos `api-*-negocio.spec.ts` acima; `frontend/tests/helpers/negocio.ts`; `backend/scripts/fixture-negocio.ts`; `frontend/tsconfig.tests.json`; esta documentação, auditoria e registro dos defeitos.

Alterados: `frontend/package.json` (somente scripts de typecheck dos testes/consolidação); `docs/testes/MIGRACAO-SESSOES-PRINCIPAL.md` (link da auditoria) e `ACOMPANHAMENTO.md` (situação atual). Arquivos da aplicação, contrato/migração e expectativas dos testes anteriores não foram modificados nesta etapa.

## Pendências

Corrigir NEG-01/02/03 em alterações próprias, preservando as expectativas e revisando o tratamento de dados já existentes antes de qualquer normalização de CPF. A migração principal de revogação continua separada, não executada e dependente de autorização específica/backup validado.

Permanecem pendentes da missão maior: recuperação clínica com email simulado, códigos de primeiro acesso/redefinição completos, cenários adicionais de prontuário e histórico, auditorias ampliadas, concorrência adicional (ex.: edição simultânea de disponibilidade), indisponibilidade real em transações e jornadas completas de interface/calendário em dispositivos. Os seis testes visuais de logout anteriores continuam cobertos; os novos testes desta etapa são de API e não são apresentados como novas jornadas E2E.
