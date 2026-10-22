# Validação final: primeiro acesso e segurança do Git

Etapa autorizada em 22/10/2026. Não houve commit, push, fetch, deploy, reescrita de histórico, rotação de segredo real ou alteração do banco principal. A exclusão do índice é explícita e limitada ao cookie temporário autorizado. Validação integral concluída: **330 aprovados, zero reprovados e zero ignorados**.

## A. Correção funcional

UI-PA-01: `PrimeiroAcesso.tsx`, em `reenviarCodigo`, esperava `dados.apto === true`. O endpoint de solicitação retorna HTTP 200 com mensagem genérica sem esse campo, protegendo contra enumeração. A tela interpretava ausência como inelegibilidade, removia o email temporário e voltava à etapa EMAIL, apesar de o novo código ter sido enviado.

Aplicado o patch anteriormente proposto, agora autorizado: HTTP 200 mantém a etapa de código, limpa os campos de código/senhas e mostra a mensagem genérica retornada pelo backend. Não foi adicionado campo de elegibilidade à API. A conclusão continua validando conta, código, expiração, tentativas e consumo atômico; nenhuma regra/cookie/limite do backend foi alterado.

Arquivo funcional: `frontend/src/pages/PrimeiroAcesso.tsx`. O patch em `PROPOSTA-REENVIO-PRIMEIRO-ACESSO.patch` é registro histórico já aplicado, não instrução para reaplicar.

Testes direcionados: `npm run test:e2e -- tests/recuperacao-visual.spec.ts`, **cinco aprovados em 20,9 s**, incluindo a regressão de reenvio, primeiro acesso dos dois perfis, recuperação e erro real de login. Expectativas preservadas. SMTP restrito ao loopback sem relay; nenhum email externo enviado.

## B. JWT no Git

| Item | Evidência sem valores de autenticação |
| --- | --- |
| Arquivo | `backend/cookies.txt` |
| Formato | Cookie jar Netscape, somente comentários e um cookie; um JWT |
| Uso | Nenhuma referência executável no código/testes; temporário de cliente HTTP, regenerável, não recurso da aplicação |
| Host registrado | Somente localhost |
| Expiração | 16/09/2026 às 23:23:49 UTC |
| Metadados JWT | HS256, emissor/audiência do sistema, sem `jti` e sem versão de sessão |
| Assinatura | Compatível com a configuração principal **local**, sem revelar nem alterar a chave; não coincide com a configuração de testes |
| Prova de rejeição | Verificação offline com `jsonwebtoken` retornou `TokenExpiredError`; sem HTTP ou banco |
| Índice atual | Removido por `git rm --cached -- backend/cookies.txt`; exclusão staged aguardando commit autorizado |
| Cópia local | Preservada, byte a byte igual à versão anterior; agora ignorada |

Inclusão histórica: commit **`0a5b63e30952d3867aff4022e4e8527eeee6c085`**, autoria 18/09/2026 03:59:03 -03:00 e commit 03:59:36 -03:00. O token já estava expirado nessa data. Não se imprimiu conteúdo do commit ou token.

Referências locais que contêm o arquivo na ponta e no histórico:

- `refs/heads/desenvolvimento` (branch atual).
- `refs/remotes/origin/desenvolvimento` (referência de acompanhamento armazenada localmente).

Upstream configurado: remoto `origin`, merge `refs/heads/desenvolvimento`; o host do remoto é GitHub, sem credencial embutida na URL configurada. O reflog dessa referência local registra `update by push`, evidência local de envio anterior. **Não houve acesso ao remoto**, portanto não se confirmou sua visibilidade pública/privada, estado atual, retenção ou existência de cópias/forks. Uma referência local não prova exposição pública atual.

Ambiente provável: desenvolvimento principal local, pela assinatura compatível e domínio localhost. Não há evidência de token AWS/produção nem de vazamento da chave de assinatura. O token está expirado e o backend corrigido também rejeita JWT sem jti; não foi necessário gravar revogação no principal para validar isso. Expiração não torna aceitável manter cookies versionados.

### Medidas aplicadas e risco residual

A remoção do índice impede que o arquivo faça parte da próxima árvore de commit **quando a exclusão for registrada**, mas não o remove de HEAD, commits antigos, referências de acompanhamento ou cópias remotas. Ainda não houve commit. Regras de ignore não apagam histórico. Cópia local e evidências de testes permanecem privadas/ignoradas; não publicá-las como relatório acadêmico.

Não se recomenda rotação automática do segredo principal apenas a partir deste JWT expirado: ele não revela a chave, foi rejeitado offline e a auditoria não encontrou o valor da chave em arquivos/histórico pesquisados. Isso não comprova ausência de comprometimento externo. Produção nova deve receber chaves independentes e aleatórias; nunca copiar chaves de desenvolvimento. Qualquer evidência adicional de chave exposta/uso indevido exige contenção e rotação coordenadas, mediante autorização própria.

### Plano separado, não executado

1. Revisar com o responsável a visibilidade e o estado do GitHub por acesso autorizado, sem publicar conteúdo sensível.
2. Registrar futuramente a exclusão atual e as proteções após revisão da lista de commit. Não realizar push nesta etapa.
3. Decidir se a política requer retirar o arquivo de todo o histórico, mesmo expirado. Se aprovado, planejar cópia de segurança protegida das referências, ambiente de trabalho separado, inventário de branches/tags e coordenação dos colaboradores.
4. Só com autorização específica considerar `git filter-repo` e eventual atualização forçada de referências remotas. Tratar caches/forks/cópias e clones dos colaboradores; remoção histórica não garante eliminação de todas as cópias. Não foi executado filter-repo/filter-branch, force push ou exclusão de refs.
5. Se houver segredo ativo realmente exposto, priorizar revogação/rotação e análise de uso antes de saneamento histórico; não rotacionar JWT/SMTP/AWS/chave clínica indiscriminadamente. A chave clínica exige plano próprio para preservar leitura dos prontuários.

## C. Auditoria de segredos e prevenção

Escopo atual: arquivos rastreados e novos não ignorados; modo staged lê blobs do **índice**, incluindo a política de exceções staged, em vez da cópia possivelmente diferente no disco. Identifica JWT mesmo expirado, chaves privadas, padrões AWS/GitHub/SMTP, URLs PostgreSQL com senha, literais de credenciais, valores conhecidos dos ambientes locais e nomes de arquivos sensíveis. Valores de `.env` são comparados somente em memória e nunca emitidos.

Histórico alcançável: **10 commits, 404 objetos e 255 blobs**, com um binário sem inspeção textual. Padrões fortes/valores locais encontraram **uma ocorrência histórica**, o JWT expirado no cookie; nenhum outro JWT/chave privada/credencial de provedor/valor sensível local nesses padrões. Não se pesquisaram objetos inalcançáveis, reflogs arbitrários, backups externos ou o remoto. A varredura histórica não certifica ausência de todo tipo possível de senha.

A varredura atual, após remover o cookie, registrou **20 ocorrências não bloqueantes**: **16 credenciais sintéticas de testes e quatro exemplos/interpolações**, sem segredo ativo detectado. Foram examinados 265 arquivos candidatos, sem bloqueios. O único binário atual é a imagem de interface `frontend/src/assets/hero.png`, não inspecionada como texto; não foram identificados arquivos de exportação de pacientes/prontuários nos candidatos. A revisão não é certificação forense de todos os conteúdos binários.

O modelo `backend/.env.example` continha exemplos fixos de senha administrativa e JWT. Não coincidiam com os valores reais locais; os campos foram deixados vazios, com instrução para segredos privados aleatórios. **`.env` e `.env.test` reais não foram alterados.** Não há credencial real nova gerada ou rotacionada.

Fixtures negativas de complexidade/schemas e SMTP local foram revisadas. Oito literais específicos têm exceções por caminho/regra/SHA-256 em `scripts/segredos-excecoes.json`, com motivos, sem publicar os valores. A exceção não permite outro valor/caminho e não desativa as regras de JWT/chaves/provedores/ambiente ou comparação com segredo real local. Exemplos conhecidos e expressões dinâmicas são classificados separadamente. Alterar a política requer revisão no mesmo commit; não há ignore geral de arquivos de testes.

### Implementação

- `scripts/verificar-segredos.mjs`: auditoria atual/staged, saída só com caminhos/linhas/classes, falha fechada em erro.
- `scripts/verificar-segredos.test.mjs`: seis regressões do mecanismo, com repositórios temporários sem commits/remotos e sem dados reais.
- `.githooks/pre-commit`: executa auditoria staged; ativado **somente neste repositório** via `core.hooksPath=.githooks`, após confirmar ausência de hook/configuração anterior.
- `.gitignore` e `backend/.gitignore`: cookie específico, estados de autenticação, traces/HAR e evidências. Não se ignoram fontes/migrações/testes necessários.
- `frontend/package.json`: `security:scan`, `security:staged`, `test:secrets`; o executor consolidado inclui os seis testes e auditoria atual antes das demais etapas.

```sh
# Na pasta frontend
npm run security:scan
npm run security:staged
npm run test:secrets
npm run test:all
```

Em clone futuro, habilitar o hook somente após revisar suas fontes: `git config --local core.hooksPath .githooks`. Ele depende de Node e não é distribuído automaticamente pela configuração local. O hook é defesa contra acidentes, não barreira contra um autor malicioso: pode ser ignorado por ferramentas e deve ser complementado por revisão e verificação obrigatória em CI futuramente autorizada. Regex/heurísticas não detectam todos os segredos; não publicar relatórios/traces mesmo com auditoria aprovada.

## D. Testes automatizados

Execução consolidada `npm run test:all`, finalizada em **22/10/2026 às 20:05:28 UTC (17:05:28 em São Paulo)**, saída 0 nas nove etapas. Os 324 casos foram preservados; seis novos testes da ferramenta Git elevam o total para **330 aprovados**, sem falhas, ignorados ou instabilidade nos relatórios Playwright. São testes de proteção real (conteúdo staged diferente do disco, JWT expirado, estado sem JWT, chaves/provedores, ambiente, exceção exata e erro de política), não duplicações de funcionalidades da aplicação.

| Conjunto | Executados | Aprovados | Reprovados | Ignorados |
| --- | ---: | ---: | ---: | ---: |
| Backend | 11 | 11 | 0 | 0 |
| Interface | 44 | 44 | 0 | 0 |
| Integração | 269 | 269 | 0 | 0 |
| Proteção de segredos | 6 | 6 | 0 | 0 |
| **Total** | **330** | **330** | **0** | **0** |

Tempo somado das nove etapas: **712,991 s (11 min 53 s)**. Interface: 144,986 s; integração: 548,750 s. Build frontend, typecheck backend, typecheck dos testes, lint e scripts adicionais passaram. Os scripts auxiliares não foram contados novamente como casos. O executor inclui todas as suítes configuradas e a nova proteção de segredos.

Após ajustes finais do scanner (diretório de execução, credenciais JSON e modelo de ambiente), `npm run test:secrets` foi repetido: seis aprovados e auditoria sem bloqueios. Também foram executados `security:scan`, o hook staged e as verificações finais somente de leitura do banco. Não houve alteração de expectativas existentes. Não restou defeito funcional reproduzido nesta execução; permanecem as limitações históricas e heurísticas descritas acima.

## E. Git e arquivos

Alterações desta etapa: tela `PrimeiroAcesso.tsx`; ignore raiz/backend; modelo backend de ambiente; scanner/política/testes/hook; scripts frontend de segurança e executor; documentação/matriz/acompanhamento e lista explícita de proposta. Migrações, contratos ORM 8, regras do backend e testes existentes preservados.

**Única mudança staged autorizada:** exclusão de `backend/cookies.txt`, sem apagar arquivo local. Os demais arquivos não foram adicionados automaticamente. A proposta textual `ARQUIVOS-PROPOSTA-COMMIT.txt` contém 157 caminhos explícitos de arquivos candidatos; a exclusão staged do cookie deve ser preservada separadamente; não usar `git add .`.

Mensagem sugerida: `fix: corrigir reenvio e impedir credenciais no versionamento`.

Não há commit nem push executado. O histórico local/remoto ainda exige decisão separada, e mudanças antigas do projeto continuam demandando revisão própria antes de versionar a versão completa.

## F. Bancos

Todas as escritas de testes desta etapa se limitam às fixtures fictícias em **`tcc_consultorio_testes`**, com `NODE_ENV=test`, correspondência com `.env.test`, host local e confirmação efetiva pelo PostgreSQL. Não houve acesso ao principal para validar o JWT: assinatura/expiração foram verificadas offline.

**`tcc_consultorio` permaneceu intocado, sem consultas, escrita, migração ou restauração nesta etapa.** O banco descartável criado na etapa anterior não foi usado ou alterado aqui. Não houve seed, cópia de registros reais ou exclusão global. A conferência final em transações somente de leitura confirmou zero contas residuais das fixtures de negócio e clínicas verificadas, três contas fictícias originais preservadas e suas versões de sessão intactas. A coluna de versão continua inteira, obrigatória e com padrão zero. Nenhuma migração foi necessária nesta correção.
