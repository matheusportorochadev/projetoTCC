# Produção nova na AWS — plano técnico, sem deploy

Decisão do usuário em 22/10/2026: PostgreSQL novo, vazio e exclusivo de produção. Preservar `tcc_consultorio` e não transportar seus registros para testes/produção. Não foi criado recurso AWS, enviada imagem, configurado serviço remoto ou executado deploy. Os comandos abaixo são instruções para uma janela futura autorizada, não automação já executada na nuvem.

## Contrato e inicialização reproduzível

O contrato emitido atual é `262d9014fd79fd6570d42e23c5c465a2c6afc07dc6a0627f78d6387e4ef74e67`. Ele inclui 16 tabelas públicas, 61 índices (inclusive índices de PK/uniqueness), 13 FKs, checks dos enums, prontuários criptografados, auditorias, `sessaoRevogada` e `usuario.versaoSessao DEFAULT 0 NOT NULL`.

**Validação local efetiva:** `backend/scripts/validar-banco-vazio.mjs`, carregado com `.env.test`/`NODE_ENV=test`, confirmou o banco de testes e criou somente `tcc_consultorio_bootstrap_validacao_20261022`. O destino foi confirmado pelo PostgreSQL antes de DDL. Começou com zero tabelas; `db init --dry-run` apresentou 74 operações aditivas. `db init --no-interactive` criou a estrutura e assinatura. O planejamento posterior `db update --dry-run` retornou zero diferenças. Nenhum usuário foi inserido. O banco ficou preservado para inspeção, sem DROP. O executor aceita somente nome fixo, host local e credencial do ambiente de testes; não serve para implantar em produção.

Reexecução verifica que todas as tabelas públicas permanecem vazias e bloqueia se houver dados de aplicação; não faz limpeza. A segunda execução confirmou zero operações, zero diferenças e zero registros em todas as tabelas de aplicação. A validação estrutural não certifica configuração AWS/TLS, carga ou privilégios mínimos de produção.

Na pasta backend, somente para repetir a validação **local descartável**:

```sh
NODE_ENV=test node --env-file=.env.test scripts/validar-banco-vazio.mjs
```

Na produção futura: revisar a conexão efetiva e o estado vazio; usar o CLI local instalado via lockfile e configuração do ambiente, com credenciais por segredo/serviço, nunca na linha de comando. Emitir o contrato em build (`contract emit` é offline) e exigir correspondência dos artefatos versionados. Revisar `node node_modules/prisma/dist/prisma.js db init --dry-run --no-interactive`, depois, somente autorizado, executar `db init --no-interactive`. Esse caminho cria diretamente o contrato completo; não depende de reproduzir migrações históricas sobre um banco inexistente. Conferir marker, contagens, FKs/checks/índices e executar novamente dry-run sem diferenças. Os índices de agenda do contrato não são restrições únicas de slot; a prevenção de conflito existente depende das transações SERIALIZABLE e do tratamento de concorrência nos serviços. Não foi inventada restrição nova que altere os estados/agendamentos históricos.

Os pacotes `20261022T0544_baseline`, `20261022T0545_revogacao_sessao_logout` e `20261022T1758_versao_sessao_senha`, com snapshots referenciados, preservam a evolução. Não aplicar baseline sobre o principal e não editar JSON/types gerados manualmente. `jti` é claim JWT, não tabela/coluna.

## Variáveis de ambiente reais

| Variável | Finalidade e formato | Tratamento |
| --- | --- | --- |
| `NODE_ENV` | `production`; controla Secure dos cookies | Configuração backend |
| `PORT` | Porta interna do serviço, padrão 3000 | Configuração backend |
| `DATABASE_URL` | PostgreSQL exclusivo de produção, conexão TLS e CA validados no cliente instalado | Segredo; papel runtime com privilégio mínimo, separado do executor DDL |
| `JWT_SECRET` | Assinatura principal, ao menos 32 caracteres; também deriva chave JWT clínica | Segredo aleatório independente; rotação coordenada encerra sessões |
| `RESET_CODE_SECRET` | HMAC dos códigos, ao menos 32 caracteres | Segredo independente do JWT e da criptografia clínica |
| `PRONTUARIO_ENCRYPTION_KEY` | Exatamente 32 bytes, Base64 canônico | Segredo crítico AES-256-GCM; cópia protegida e estratégia de recuperação |
| `FRONTEND_URLS` | Origens HTTPS exatas, separadas por vírgula, sem paths/barra final | Usada conjuntamente em CORS e CSRF; sem wildcard com credenciais |
| `SMTP_HOST` | Host do provedor autorizado | Configuração backend |
| `SMTP_PORT` | 465 (TLS) ou 587 (STARTTLS obrigatório no código) | Configuração backend |
| `SMTP_USER`, `SMTP_PASS` | Credenciais do transporte | Segredos backend |
| `SMTP_FROM` | Remetente verificado e autorizado | Configuração backend |
| `VITE_API_URL` | URL **pública** HTTPS da API, sem segredo; resolvida no build | Frontend; configuração central `src/config/api.ts`, nova nesta etapa |
| `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_SENHA` | Entradas do script existente de administrador inicial | Somente bootstrap futuro revisado/autorizado; não persistir a senha como env do runtime |
| `TESTE_SENHA` | Fixture local | Exclusiva de testes; não enviar para produção |

Nenhum valor real foi incluído. Não há outras variáveis AWS consumidas pelo código atual: IAM/roles/ARNs de infraestrutura serão definidos no futuro. Variáveis `VITE_*` entram no JavaScript público e jamais podem conter credenciais. Alterar `VITE_API_URL` requer novo build; mudar variável só no servidor de arquivos não altera o bundle. Sem configuração, o padrão continua local para desenvolvimento, portanto configurar explicitamente no build de produção.

O script existente `src/scripts/criar-admin.ts` é idempotente por email, mas cria conta com defaults de primeiro acesso; revisar o onboarding administrativo e o transporte de recuperação antes de usá-lo na produção. Não executar `test:seed` em produção. O administrador inicial não foi criado no banco descartável. A chave clínica tem identificador fixo "1": não substituir a chave após registros existirem sem uma estratégia de rotação/migração aprovada.

## Arquitetura proposta e sequência futura

1. Escolher região, domínio, responsável operacional, orçamento e objetivos de recuperação. Uma opção a avaliar é frontend estático HTTPS e API em serviço de containers, com RDS PostgreSQL privado. A escolha não está contratada nem provisionada. Planejar frontend/API sob o mesmo site (por exemplo, subdomínios de um domínio próprio) para preservar SameSite=Lax atual; usar domínios de sites distintos requer avaliação específica, sem mudar cookies automaticamente.
2. Rede: banco sem exposição pública, acesso somente do backend por security group; TLS com validação de CA/hostname e rejeição de conexões sem TLS. Validar efetivamente o suporte/opções do driver PostgreSQL do ORM instalado antes de liberar. [TLS no RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html).
3. Segredos fora de repositório/imagem/logs, com IAM mínimo e auditoria. Se usar ECS, referências a Secrets Manager são uma opção; a aplicação continua lendo variáveis de ambiente. Coordenar atualização de tasks quando valores mudarem. [Integração Secrets Manager/ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html).
4. Pipeline futuro: `npm ci` pelos lockfiles; tipos, lint, build, backend/scripts e suíte Playwright contra PostgreSQL exclusivo de CI, nunca RDS de produção. Guard atual exige banco local de testes; adaptação de CI precisa manter verificação efetiva e isolamento. Nenhum workflow remoto foi criado/alterado nesta etapa.
5. Construir artefato frontend com `VITE_API_URL` correto e API com dependências/contratos fixados. O backend hoje inicia via `tsx`; definir imagem/comando e health/readiness sem presumir build inexistente. `/` é liveness simples, não prova disponibilidade do banco.
6. Criar banco vazio, revisar/aplicar somente o contrato atual pelo procedimento acima, conferir estrutura/assinatura. Separar identidade DDL e identidade da aplicação e validar permissões necessárias ao ORM/upsert/auditoria, sem superusuário no runtime.
7. Inicializar administrador por procedimento específico revisado, validar recuperação, remetente e certificados. Usar SMTP local apenas nos testes. Não levar contas fictícias/seed para a produção.
8. Validar HTTPS, cookies Secure/HttpOnly/SameSite/Path, origem CORS/CSRF, login/logout/reset/revogação persistida e isolamento clínico por smoke autorizado, sem suíte de fixtures escrevendo no banco de produção.
9. Habilitar monitoramento e logs sanitizados. O limiter atual é por processo; mais de uma instância exige decisão sobre armazenamento compartilhado e `trust proxy`/IP antes de abrir tráfego pelo proxy e, especialmente, antes de escalar. Não ativar trust proxy indiscriminadamente nem desativar limites. Manutenção de revogações expiradas ainda não foi implementada; nunca apagar entradas antes da expiração.
10. Publicar somente com aprovação específica e suíte aprovada. Não há garantia de prontidão de produção apenas porque a estrutura vazia foi validada localmente.

## Backup, reversão e indisponibilidade

Antes da primeira publicação, não há histórico real a migrar. Após receber dados, configurar backups privados/criptografados e testar recuperação em ambiente segregado autorizado, preservando também a chave clínica. Não restaurar dumps reais no banco automatizado de testes ou sobre o principal como ensaio.

Bootstrap do banco novo ocorre antes de abrir tráfego. Atualizações posteriores exigem plano próprio de compatibilidade, timeouts de lock, drenagem e eventual janela de indisponibilidade. Para esta versão, não misturar backend vulnerável e corrigido: uma instância antiga pode aceitar JWTs revogados. Reversão do serviço deve preservar verificação de revogações/versões e chave clínica; não apagar tabela, reduzir versões ou restaurar snapshot que reautorize tokens. Preferir correção adiante. Rotação da chave JWT é distinta da chave de criptografia dos prontuários.

Pendências antes de AWS: aprovação de infraestrutura/orçamento, TLS real, IAM/privilégios mínimos, onboarding admin, recuperação/backup ensaiado, configuração de proxy e limiter em múltiplas instâncias, rotação de chaves clínicas, readiness e tratamento dos achados da suíte/segredos no Git. Nenhuma dessas decisões foi simulada como implantação já concluída.
