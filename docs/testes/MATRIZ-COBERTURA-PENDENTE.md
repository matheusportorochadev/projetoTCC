# Matriz de cobertura pendente — continuação do TCC

## Validação de segurança Git — 22/10/2026

**330 aprovados, zero falhas e zero ignorados**: 324 preservados (11 backend, 44 interface, 269 integração) e seis regressões da ferramenta de segredos. Defeito visual de reenvio corrigido sem alterar expectativas. Build, tipos e lint aprovados. A consolidação 323/324 abaixo é registro histórico anterior à correção. Cobertura funcional pendente permanece descrita nas tabelas; seis testes de infraestrutura não substituem esses cenários. Detalhes em `VALIDACAO-FINAL-SEGURANCA-GIT.md`.


## Consolidação atual — inventário 294 → 324

Foram preservados os 294 casos e acrescentados **30**: 22 API e oito de navegador. Descoberta oficial: 269 API (26 arquivos), 44 UI (oito arquivos), 11 backend; os dois scripts adicionais não são somados novamente. Resultado final de 22/10/2026 às 19:33:45 UTC: **323 aprovados, um reprovado, zero ignorados/instáveis**. Os 294 anteriores passaram; novos: 29 aprovados e um defeito real de reenvio visual.

| Funcionalidade | Testes existentes nesta versão | Cenários pendentes | Prioridade |
| --- | ---: | --- | --- |
| Login e Zod de autenticação | 11 | Combinações adicionais de tipos/cookies em produção | Alta |
| Autorização por perfis | 6 | Matriz completa de escritas; B15 acrescentado no grupo complementar abaixo | Alta |
| JWT, logout, revogação e falhas/rollback backend | 23 | Falhas de outros serviços/banco, múltiplas instâncias reais | Alta |
| Primeiro acesso e recuperação principal/clínica API | 44 | Limites temporais exatos, enumeração sob falha SMTP/tempo | Alta |
| Finalidade de códigos, tentativas concorrentes, perfil e email normalizado | 5 | Mais combinações entre fluxos e bloqueio durante recuperação | Alta |
| Autorização clínica, histórico, IDs e validações | 37 | Assinatura/formatos JWT clínico restantes; todos os limites de campos/buscas acentuadas | Alta |
| Médicos | 21 | Variantes visuais adicionais; edição geral não existe na API atual | Média |
| Pacientes/CPF/vínculos | 25 | Mais erros visuais e painel completo | Alta |
| Disponibilidade | 20 | Navegação rápida e mais navegadores | Média |
| Agendamentos | 18 | Casos de falha parcial adicionais; conclusão sem rota não inventada | Alta |
| Remarcações | 9 | Jornadas completas mobile/tablet e mais transições concorrentes | Alta |
| Concorrência de agenda/cadastro | 4 | Falhas parciais além dos rollbacks já cobertos | Alta |
| Auditorias | 29 | Paginação com timestamps empatados, filtros combinados restantes; eventos ausentes dependem de decisão funcional | Média |
| HTTP e JWT adversariais | 28 | TLS/cookies reais em produção, proxy/limites compartilhados | Alta |
| Interface e responsividade | 44 | Reenvio de primeiro acesso (defeito), mais navegadores, acessibilidade/contraste, demais erros/formulários | Alta |
| **Total** | **324** | Cobertura integral A–L ainda não concluída | **323 aprovados / um defeito real** |

As contagens agrupam arquivos disjuntos e não contam o mesmo teste duas vezes, mesmo quando ele cobre mais de uma função. “Existentes nesta versão” inclui os novos casos implementados, não significa automaticamente aprovados. Prontuários: 23 casos prévios de autorização/histórico +14 novos. Sessões: 12 API +11 backend. Recuperação visual é contabilizada somente em interface.

Novos arquivos: `api-clinicos-integridade.spec.ts` (14: pares paciente/prontuário, referências anteriores indevidas, seis tipos numéricos, espaços/null e 10.000/10.001 caracteres abaixo do teto HTTP); `api-auditorias-paginacao.spec.ts` (3: login, agenda, clínico com 50+11); `api-recuperacao-isolamento.spec.ts` (5: finalidades, tentativas concorrentes nos dois fluxos com contador, mudança de perfil e email normalizado); `recuperacao-visual.spec.ts` (5: primeiro acesso dos dois perfis, reenvio, recuperação principal e erro de login); `historico-numeracao.spec.ts` (3: sequência por paciente e IDs estáveis em desktop/tablet/celular).

Baterias direcionadas: 22 API aprovados; numeração passou nos três tamanhos; primeiro acesso dos dois perfis e recuperação principal passaram após corrigir seletores/rotas na fixture. Reenvio confirmou defeito UI-PA-01, mantido sem skip e sem mudar a API anti-enumeração. Ver [DEFEITOS-CONSOLIDACAO.md](DEFEITOS-CONSOLIDACAO.md).

Decisão atual de banco: produção nova/vazia, sem atualização do principal. Bootstrap local adicional validou o contrato inteiro, sem registros reais. Ver [PLANO-PRODUCAO-AWS.md](PLANO-PRODUCAO-AWS.md). Os cenários não aplicáveis listados historicamente abaixo continuam não aplicáveis; não há rota de edição geral de médico, auditoria de médicos ou conclusão de consulta a inventar. A disponibilidade é por datas, não recorrência semanal.


## Atualização após correção autorizada dos seis defeitos

Consolidação de 22/10/2026 às 18:15:12 UTC: **294 executados/aprovados, zero falhas, zero ignorados e zero instáveis**. Os 288 anteriores, incluindo as seis regressões, foram preservados e passaram. Os seis novos complementam revogação por reset e atomicidade; não duplicam os casos anteriores.

| Categoria desta correção | Existentes | Novos | Pendentes | Situação |
| --- | ---: | ---: | --- | --- |
| Suíte anterior completa | 288 | 0 | Lacunas A–L abaixo | Todos aprovados, seis defeitos corrigidos |
| Reset: sessões, reinício, legado e vencedor concorrente | 0 | 3 | Outras falhas de serviços | Todos aprovados |
| Rollback real dos três fluxos de credenciais | 0 | 3 | Falhas parciais fora desses fluxos | Todos aprovados |
| **Total atual** | **288** | **6** | Cobertura integral ainda em andamento | **294 aprovados** |

Typecheck backend/testes, lint, build e os dois scripts avulsos passaram. Foram aplicadas somente uma coluna aditiva e alterações de fixtures fictícias no banco confirmado `tcc_consultorio_testes`. Principal não acessado nesta etapa. Causas, arquivos, testes, SQL e aplicação futura mediante nova autorização: [CORRECAO-SEIS-DEFEITOS.md](CORRECAO-SEIS-DEFEITOS.md).

As referências abaixo a SEG-02/COD-01/02/03/HTTP-01/02 **reprovados ou aguardando aprovação** são o registro histórico da expansão anterior. Foram resolvidas na atualização acima. As demais lacunas e itens não aplicáveis continuam válidos.

## Histórico da expansão anterior (178 → 288)


Referência preservada: **178 casos existentes**. Foram implementados **110 casos novos**, descobertos pelas configurações atuais: 90 de API e 20 de navegador. Total inventariado: **288 casos** (244 API, 36 navegador e oito node:test). Os dois scripts avulsos são verificações adicionais, não casos artificialmente somados a esse total.

A matriz inicial foi criada antes da implementação. Esta revisão registra a expansão efetiva. Um caso pode exercitar vários itens do planejamento; cada caso é contado em apenas uma linha. As lacunas descrevem cenários, pois não há uma contagem honesta de futuros testes sem definir sua granularidade.

| Categoria | Existentes | Novos | Pendentes | Situação |
| --- | ---: | ---: | --- | --- |
| Login e validações | 11 | 0 | Normalização específica no login, combinações de campos e respostas | Parcial; existentes preservados |
| Permissões de perfis | 6 | 0 | Mudança real de perfil no banco (B15), matriz completa de escritas | Parcial; redirecionamento visual acrescentado nas jornadas |
| HTTP: CORS, CSRF, Helmet | 8 | 0 | Casos adicionais além do conjunto original; novos erros abaixo | Parcial |
| Sessões e falhas persistidas | 17 | 0 | SEG-02 na redefinição de senha; falhas de banco fora da revogação | Revogação/logout preservados; expiração/claims abaixo |
| Autorização clínica, recuperação e histórico | 23 | 12 | Consumo concorrente do código; alguns formatos/assinaturas e combinações de IDs clínicos | Novos fluxos de recuperação/limites implementados |
| Médicos | 21 | 0 | Jornadas/variantes adicionais de interface | API preservada; jornada real abaixo |
| Pacientes e CPF | 25 | 0 | Painel completo, variantes adicionais da interface | API e regressões de CPF preservadas |
| Disponibilidade | 20 | 0 | Calendário em mais navegadores e navegação rápida entre meses | API preservada; configuração visual nos três tamanhos abaixo |
| Agendamentos | 18 | 0 | Conclusão de consulta sem rota disponível; demais jornadas possíveis | API preservada; ações reais na interface abaixo |
| Remarcações | 9 | 0 | Versões mobile/tablet do fluxo completo de troca de perfis | API preservada; jornadas de aceite/recusa abaixo |
| Concorrência de agenda/cadastros | 4 | 0 | Falhas parciais adicionais; códigos são contados nos respectivos fluxos | Proteções existentes preservadas |
| Interface e responsividade | 16 | 20 | Acessibilidade/contraste completos, mais navegadores e variantes | Interações reais em desktop, tablet e celular |
| Primeiro acesso e recuperação principal | 0 | 32 | Consumo concorrente; sessões antigas; enumeração durante falha SMTP/por tempo | Fluxos completos e regressões implementados |
| Auditorias administrativas | 0 | 26 | Paginação profunda em todos os módulos; eventos ainda não emitidos | Autoria, resultados, filtros, paginação e privacidade exercitados |
| Segurança complementar | 0 | 20 | Tratamento HTTP-01/02; falhas simuladas de outros serviços | JWTs válidos/adversariais, IDs, parser e login limitado |
| **Total de casos** | **178** | **110** | Seis regressões reais identificadas nas execuções focadas | **288 executados: 282 aprovados, 6 reprovados, zero ignorados** |

## 1. Implementados e já aprovados antes desta continuação

Os 178 casos do relatório `RELATORIO-EXECUCAO-COMPLETA.md` permanecem presentes. Incluem os 30 originais, revogação persistente com reinicialização, senhas clínicas, isolamento entre médicos, histórico, APIs de médicos/pacientes/disponibilidade/consultas/remarcações e concorrência. Não foram alteradas expectativas para reduzir falhas.

Os únicos dois arquivos antigos de casos ajustados por lint foram `api-prontuarios-cadastro-isolado.spec.ts` e `api-sessoes-revogacao.spec.ts`: destructuring vazio substituído por uma fixture nomeada, sem mudança de asserções ou contagem. Helpers compartilhados foram extraídos para reutilizar preparação/limpeza já existente.

## 2. Novos cenários por arquivo

| Arquivo | Casos novos | Cobertura principal |
| --- | ---: | --- |
| `frontend/tests/api-primeiro-acesso.spec.ts` | 17 | Médicos/pacientes: elegibilidade, senha inicial, flags, login, código errado/expirado/reutilizado, cinco tentativas, código de outro usuário, reenvio, política de senha/confirmação, Zod, enumeração, limite de envio e consumo simultâneo |
| `frontend/tests/api-recuperacao-senha.spec.ts` | 15 | Três perfis: troca real de senha, rejeição da antiga, auditoria, código errado/expirado/de outro usuário/reutilizado, Zod, enumeração, envio limitado, SMTP indisponível/retomada, sessão anterior e consumo simultâneo |
| `frontend/tests/api-recuperacao-clinica.spec.ts` | 12 | Recuperação válida, nova/antiga senha, cookie revogado por versão, principal preservado, expiração, tentativas, isolamento, perfis indevidos, destinatário imposto, códigos, limite de envio/desbloqueio, SMTP indisponível e consumo simultâneo |
| `frontend/tests/api-auditorias.spec.ts` | 26 | Quatro módulos, 401/403, login/logout/falha, eventos de paciente/agenda/prontuário, autoria, instante, resultado, metadados sem conteúdo clínico, 61 registros para paginação 50+11, ordem, contadores, filtros e filtros inválidos |
| `frontend/tests/api-seguranca-complementar.spec.ts` | 20 | JWT principal expirado, emissor/audiência/assinatura/perfil/sub/nbf; JWT clínico expirado/finalidade/usuário/emissor/audiência/vínculo; JSON, limite 10 KB, IDs e 11ª falha de login auditada |
| `frontend/tests/jornadas-reais.spec.ts` | 18 | Admin/auditoria, médico/pacientes e prontuários, paciente/calendário/modal/solicitação/estado/cancelamento nos três tamanhos; CRUD visual de médico; agenda nos três tamanhos; confirmação/recusa/remarcação/cancelamento pelo médico e troca de sessão |
| `frontend/tests/remarcacao-real.spec.ts` | 2 | Paciente solicita e médico aceita/recusa no navegador, com nova troca de sessão para acompanhar o resultado |
| **Total novo** | **110** | Nenhum caso duplicado apenas para aumentar quantidade |

Os cenários de viewport repetem uma jornada para verificar uma condição distinta exigida no planejamento: layout, menus, acesso aos formulários, modais, rolagem e largura em cada resolução. Não são contados como cobertura de Firefox/WebKit, que não foram configurados.

## 3. Correspondência com o planejamento A–L

- **A — autenticação:** logins e cookies anteriores preservados. A19–A21 e assinatura/nbf são agora exercitados com JWTs de assinatura válida e controles positivos antes de modificar um claim. A30 foi acrescentado com limite real isolado. Redefinição não encerra JWT anterior: SEG-02. A04–A12 completos, exclusão de usuário e todas as variantes de cookies ainda precisam de refinamento.
- **B — autorização:** 401/403 anteriores preservados. Auditorias cobrem os três estados de autenticação/perfil e troca visual de sessão confirma isolamento/retorno ao próprio perfil. B15, alteração efetiva de perfil no banco, permanece pendente.
- **C/D — médicos/pacientes:** APIs anteriores preservadas. Agora há cadastro/bloqueio/reativação visual de médico, cadastro/pesquisa/edição visual de paciente e testes de largura nos três tamanhos. Não se declara todo o dashboard coberto.
- **E — disponibilidade:** E18/E19 avançaram com configuração real em desktop/tablet/celular; o celular usa calendário e modal, não o formulário lateral oculto. Modal de horários do paciente e persistência após recarregar também são verificados. Limites/viradas de datas continuam nas APIs anteriores.
- **F — consultas:** interface agora solicita PENDENTE, acompanha CONFIRMADA e cancela; o médico confirma, recusa, remarca e desmarca; as duas decisões de remarcação atravessam os perfis pelo navegador. Regressões de conflito, passado e bloqueio permanecem. Conclusão/REALIZADA/FALTOU não ganhou endpoint fictício.
- **G — senha clínica:** G14 e G27–G29 avançaram com limite de desbloqueio, recuperação, expiração, tentativas, reuso sequencial/concorrente, versionamento e isolamento. G19–G22 e claims de finalidade/emissor/audiência foram exercitados. Alguns formatos adulterados, bloqueio durante o fluxo e concorrência com reenvio continuam pendentes.
- **H — prontuários:** H07/H08 avançaram na interface: dois registros, carregar anterior, editar somente o novo e consultar o antigo. A interface pesquisa somente pacientes do médico; a auditoria administrativa retorna allowlist de metadados. Ainda faltam combinações específicas de IDs de prontuário/paciente, limites de todos os campos e todos os casos de busca com acentos e asserções específicas da numeração sequencial visual.
- **I — primeiro acesso/recuperação:** fluxo principal implementado com SMTP local. Política de senha é rejeitada usando código válido, impedindo que um 400 genérico do serviço seja confundido com validação Zod. Enumeração é comparada entre elegível, inelegível, desconhecido e bloqueado, no funcionamento normal. Permanecem os defeitos de consumo simultâneo/sessão antiga e avaliação de enumeração quando SMTP falha/por tempo. Não existe contador por código no reset principal: os testes exercitam o limite por IP existente, sem inventar essa proteção.
- **J — segurança:** parser, tamanho de corpo, claims e parâmetros acrescentados. HTTP-01/02 retornam status incorreto e ficam reprovados. Revogação persistida e suas falhas simuladas anteriores continuam obrigatórias; ainda faltam falhas simuladas de outros serviços e recuperação geral do banco.
- **K — auditoria:** quatro módulos existentes cobertos com acesso e metadados reais; criação/consulta/histórico clínico e alterações de senha são auditados nos testes. A paginação 50+11 e filtros combinados são aprofundados em pacientes; repetir os limites específicos dos demais módulos continua pendente. LOGIN_BLOQUEADO também é validado.
- **L — interface:** foram implementadas interações reais, não apenas abertura de páginas. Login, logout, navegação, formulários, modais, troca de perfis, tema disponível, filtros/páginas, calendários e preservação do histórico avançaram. Mais navegadores, acessibilidade/contraste, remarcações móveis e todos os caminhos de erro ainda não estão integralmente cobertos.

## 4. Não aplicáveis ou ausentes na arquitetura atual

- Não há módulo/tabela/rota de auditoria de médicos no código examinado. Não foi inventado evento para cadastro/bloqueio administrativo.
- Não há endpoint para concluir consultas como REALIZADA/FALTOU apenas porque esses valores existem no enum. F24/F25 ficam não aplicáveis à API atual, até existir fluxo correspondente.
- Disponibilidade é configurada por datas; não há regra recorrente por dia da semana a simular como se existisse.
- Não há rota separada para apenas confirmar o código do reset principal: validação e troca de senha ocorrem juntas em `/auth/redefinir-senha`.
- Não há troca autenticada de senha principal sem código no conjunto de rotas atual. O fluxo real é o de recuperação/redefinição.
- Nem toda mudança de paciente produz evento no backend atual; `CADASTRAR_PACIENTE` existe, mas não se presumiram eventos de edição/bloqueio ausentes. Ampliar a emissão exige decisão funcional separada.
- A área administrativa não oferece o mesmo botão de tema disponível nas áreas médico/paciente. Não se registrou teste de tema administrativo fictício.

## 5. Infraestrutura e limitações

SMTP local real, sem relay e aceitando somente destinatários fictícios `@example.com`. O transporte de produção não foi alterado. Instância por teste nos fluxos de recuperação/segurança permite verificar limites originais sem exceções por ambiente. JWTs adversariais usam chave efêmera da própria instância, em memória, e controles positivos.

Fixtures confirmam conexão efetiva com `tcc_consultorio_testes` antes de preparar, alterar ou limpar registros próprios. Não houve seed, migração ou acesso ao banco principal. Dados de auditoria sintéticos de 2020 são somente para paginação e nunca apresentados como eventos reais de pacientes reais.

O script legado agora cria uma fixture própria, obtém IDs dinamicamente, executa seus 14 checks e limpa em `finally`. Ambos os scripts avulsos fazem parte de `test:scripts`, incluído em `test:all`. Lint passou a fazer parte do comando consolidado. O executor prossegue após reprovações e retorna erro ao final; cancelamento fica identificado separadamente.

Não foram desativadas regras de lint. O reset de formulário clínico usa identidade React (`key`) e os carregamentos são continuações das respostas HTTP, sem temporizadores artificiais. Callbacks estáveis e dependências explícitas corrigem os avisos. Padrões vazios das fixtures foram substituídos por fixtures nomeadas; o callback Playwright deixou de usar o nome reservado de hook React.

Erros brutos do proxy podem conter headers: uma falha de desenvolvimento incluiu um JWT exclusivamente fictício, cuja conta e instância com chave efêmera foram encerradas. O proxy foi corrigido para não propagar esse erro bruto. Screenshots são capturados antes de fechar a página e requests cancelados no teardown são tratados; traces com códigos/cookies permanecem desativados nos novos casos sensíveis. Nenhum token é reproduzido nesta documentação.

## 6. Resultado e próxima etapa

A consolidação final terminou em 22/10/2026 às 17:42:11 UTC (14:42:11 em America/Sao_Paulo): **288 executados, 282 aprovados, seis reprovados, zero ignorados e zero instáveis**. Os 178 anteriores passaram. Entre os 110 novos, 104 passaram e seis reproduziram defeitos reais. As seis regressões identificadas são mantidas em testes; detalhes em [DEFEITOS-COBERTURA-PENDENTE.md](DEFEITOS-COBERTURA-PENDENTE.md). A missão completa permanece em andamento. Prioridade seguinte: aprovar a correção de consumo atômico dos códigos e revogação por troca da senha; depois ampliar as lacunas acima, preservando as expectativas existentes.


## 7. Resultado efetivo por prioridade

| Prioridade | Novos casos | Aprovados | Reprovados | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| Primeiro acesso e recuperação principal/clínica | 44 | 40 | 4 | 0 |
| Auditorias | 26 | 26 | 0 | 0 |
| Interface real e responsividade | 20 | 20 | 0 | 0 |
| Segurança complementar | 20 | 18 | 2 | 0 |
| **Novos** | **110** | **104** | **6** | **0** |
| Regressão anterior | 178 | 178 | 0 | 0 |
| **Total** | **288** | **282** | **6** | **0** |

Não há categoria escondida por causa das reprovações: o executor concluiu as oito verificações, com cancelamento `false`. Somente `test:integration` retornou código 1, pelas seis falhas reais. Backend typecheck, oito testes de sessão, dois scripts avulsos, typecheck dos testes, lint, build e os 36 casos totais de interface foram aprovados.

Tempo total dos processos da consolidação: **572,627 s** (9 min 32,6 s). Tempo Playwright: interface **114,449 s** e integração **443,683 s**. Esses tempos não somam novamente as baterias focadas de desenvolvimento.

A missão integral não está concluída. A próxima decisão de segurança envolve consumo atômico de códigos e revogação por alteração da senha, sem relaxar expectativas. As demais lacunas listadas permanecem explícitas.


Proteção final conferida por consulta somente leitura ao banco confirmado: zero contas `negocio.*` residuais e três contas fictícias originais preservadas. Uma fixture de uma interrupção de desenvolvimento foi limpa pelo seu UUID exato, não por varredura de exclusão. Nenhuma migração ou escrita no principal ocorreu.
