# Auditoria do Git e proposta de versão — 22/10/2026

**Atualização posterior autorizada:** `backend/cookies.txt` foi removido somente do índice, com cópia local preservada e ignorada. Scanner e hook locais foram implementados. O histórico não foi reescrito. O estado abaixo é histórico; consultar [VALIDACAO-FINAL-SEGURANCA-GIT.md](VALIDACAO-FINAL-SEGURANCA-GIT.md).


Não foi executado add, commit, push, reset, clean, descarte, exclusão ou reescrita de histórico. O índice estava vazio. Há alterações prévias à missão de testes, inclusive páginas/rotas/auditorias: `git diff` não prova autoria de cada trecho. A proposta exige revisão dessas funcionalidades pelo responsável, não apenas aprovação dos testes.

## Achado de credencial

`backend/cookies.txt` **já é rastreado** e contém JWT serializado. Foi inspecionada somente a expiração em memória, sem exibir token/identidade: o token está expirado na data da auditoria. Isso reduz a possibilidade de reutilização imediata, mas não torna apropriado versionar cookies. A varredura local procurou valores exatos das variáveis sensíveis dos ambientes, chaves privadas e JWTs nos arquivos rastreados/candidatos; não encontrou outros desses padrões. Não é auditoria exaustiva de todo o histórico nem garantia de ausência de qualquer segredo.

O arquivo não foi apagado nem removido do índice, conforme a restrição. A nova regra `.gitignore` evita novos cookies **não rastreados**; não remove nem oculta o que já é rastreado. Antes de considerar publicação/versionamento saneado, aprovar tratamento desse arquivo e, se necessário, do histórico. Não reescrever histórico ou rotacionar credenciais automaticamente. Uma remoção futura do rastreamento preservando a cópia local é possível, mas não foi executada. O token não é reproduzido em nenhum relatório.

Arquivos `.env`/`.env.test` reais não estão rastreados nem na proposta. `.env.example` é modelo sem credenciais reais e deve ser versionado. Nenhum segredo é colocado em `VITE_*`, que é público no bundle.

## Classificação

| Grupo | Tratamento |
| --- | --- |
| Backend fonte, rotas, schemas, serviços e middlewares | Preservar/versionar as correções de CPF, datas, concorrência, revogações e códigos atômicos junto aos contratos compatíveis; revisar mudanças anteriores de funcionalidade |
| Frontend fonte/CSS/layouts e `EditarPaciente.tsx` | Preservar; incluir na versão após revisão das mudanças anteriores. `config/api.ts` e adoção de VITE_API_URL são a configuração nova desta etapa |
| `contract.prisma`, `contract.json`, `contract.d.ts` | Versionar juntos; JSON/types são gerados necessários, não caches. Não regenerar manualmente nem trocar por Prisma de outra geração |
| Pacotes de migração baseline/revogação/versão e snapshots `89bfb590…`, `8dad27b5…`, `262d9014…` | Versionar como grafo completo; a baseline é referência de criação, não instrução para recriar o principal |
| Snapshots novos `55c92396…` e `fdc07296…` | Preservar e revisar manualmente: não referenciados pelos três pacotes novos examinados, fora da proposta automática; não excluir |
| `migrations/app/refs/db.json` | Preservar/versionar como referência do grafo local atual; não afirma que produção tem essa assinatura |
| `backend/scripts/`, `backend/tests/`, `frontend/tests/`, Playwright configs/tsconfig/scripts | Versionar; guard efetivo e fixtures próprios são parte da infraestrutura. Validador do banco vazio não deve ser executado no principal/produção |
| `package.json` e lockfile frontend | Versionar juntos; Playwright e comandos fazem parte da suíte. Nenhuma dependência foi instalada nesta etapa |
| `docs/testes/` e lista explícita de commit | Versionar documentação textual sem segredos, distinguindo evidência histórica e atual |
| `.gitignore` raiz/backend/frontend | Versionar. Acrescentada proteção de ambientes, cookies, dumps, backups, evidências e arquivos temporários não rastreados |
| Relatórios HTML, screenshots, traces, resumo JSON, logs, dist e node_modules | Ignorar, preservar localmente; podem conter cookies/códigos ou dados fictícios. Não publicar como relatório acadêmico |
| `backend/src/prisma/contract.prisma.save` | Backup antigo já rastreado: preservar e avaliar retirada do Git posteriormente; não é contrato ativo e não entra nas mudanças propostas |
| `analise_backend_prontuarios.txt`, scripts Python pontuais da raiz/frontend | Preservar no disco; ignorados e fora da proposta. Avaliar remoção futura somente com autorização |
| `.vscode/extensions.json` | Revisão opcional do responsável; fora da proposta técnica principal |
| `backend/cookies.txt` | Achado sensível rastreado; tratamento manual obrigatório, sem remoção nesta etapa |

Três linhas com espaços finais em arquivos já modificados foram corrigidas, sem alterar comportamento. `git diff --check` será conferido ao finalizar. Não foi feita grande refatoração para reduzir o diff: muitas mudanças são anteriores e precisam continuar visíveis.

## Proposta explícita, sem staging

A lista em [ARQUIVOS-PROPOSTA-COMMIT.txt](ARQUIVOS-PROPOSTA-COMMIT.txt) enumera os caminhos candidatos, sem `git add .`. Ela inclui fontes/contratos/migrações/testes/docs necessários e exclui os itens locais acima. Revisar cada diff antes de selecionar caminhos; o arquivo é uma proposta, não aprovação de autoria, publicação ou remoção do cookie já no histórico.

Mensagem sugerida: `test: consolidar cobertura, seguranca e bootstrap reproduzivel`.

Pode-se separar em commits coerentes para facilitar revisão, preservando dependências: correções de backend/contratos/migrações; infraestrutura e testes; frontend/configuração/documentação. Não separar código que exige `versaoSessao` do contrato correspondente numa versão executável. Os arquivos da interface anteriormente alterados precisam de revisão funcional própria. Não há commit executado nesta entrega.

## Comandos e descoberta

`frontend/npm run test:all` executa oito etapas: tipos backend, backend node:test, dois scripts avulsos, tipos dos testes, lint, build, UI e API. O executor prossegue após falha e retorna código não zero. `test:e2e:ui` é somente o mesmo conjunto UI em modo interativo, não suíte adicional. Playwright UI exclui `api-*.spec.ts`, e integração seleciona esses arquivos; os novos arquivos seguem essa convenção. Scripts avulsos verificam seis e 14 condições adicionais e não são somados novamente como casos Playwright.

Relatórios e contagem final: [RELATORIO-CONSOLIDACAO-TCC.md](RELATORIO-CONSOLIDACAO-TCC.md). Não há prontidão incondicional para publicação enquanto achados do Git e eventuais regressões legítimas estiverem pendentes.


Verificação de dependências: `npm ls --depth=0` encerrou com código 0 nos dois projetos, sem dependência declarada ausente. Backend apresenta `@img/sharp-wasm32` como extraneous somente em `node_modules`; não foi removido, instalado ou incluído na proposta. `@prisma/client` 7.x continua declarado como legado, enquanto o runtime usado é `@prisma/orm-postgres` 8 rc.9 e CLI 8 rc.10; não foi feita atualização ou remoção automática. O lockfile e a versão Node devem ser fixados no futuro ambiente limpo. `migration check` passou e `contract emit` gerou JSON/types byte a byte idênticos. Isso não equivale a validar instalação limpa por `npm ci`, que não foi executada para não substituir dependências locais sem necessidade.


Isolamento da interface: a configuração final usa Vite próprio em `http://localhost:5174`, `reuseExistingServer=false` e `VITE_API_URL=http://localhost:3000` explícita. APIs isoladas aceitam somente as duas origens locais necessárias (5173 para requisições HTTP e 5174 para navegador), sem alterar `.env`, CORS/CSRF normais ou production. As navegações das jornadas antigas foram ajustadas para base relativa sem mudar expectativas. Isso evita herdar uma URL de produção ou reutilizar outro frontend após introduzir a configuração pública. O Vite existente em 5173, confirmado no mesmo diretório do projeto, não foi encerrado.


Estado final conferido: 55 arquivos rastreados modificados, 101 arquivos novos não ignorados e índice vazio. A proposta enumera 151 caminhos; os demais ficam para revisão manual. Varredura final de 261 arquivos atuais: somente o JWT expirado já rastreado em `backend/cookies.txt`; nenhum identificador AWS/chave privada detectado nos padrões adicionais. Relatório e log final sem JWT serializado. Esses números não incluem dependências/evidências ignoradas e não substituem auditoria exaustiva de histórico.
