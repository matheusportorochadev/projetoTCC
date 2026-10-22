# Preparação da recriação do banco principal

## Resultado em 22/10/2026

**Preparação validada em ambiente descartável; execução definitiva depende de nova autorização.** O banco `tcc_consultorio` foi usado exclusivamente para leitura e `pg_dump`. Nenhuma alteração, migração, redefinição de senha, encerramento de conexão ou recriação foi executada nele. `tcc_consultorio_testes` não foi acessado nesta preparação. Nenhum `.env` foi alterado; nenhum commit, push ou deploy foi feito.

O ensaio final começou às 22:55:07 UTC (19:55:07 em São Paulo). Existiu um ensaio preliminar igualmente isolado; seus bancos e backups foram preservados, sem limpeza automática. O ensaio final acrescentou renovação da geração de sessão somente na cópia nova do administrador.

## Administrador e dependências

Foi encontrado **um único ADMIN**, ativo, com primeiro acesso concluído e hash bcrypt válido em formato. Não se registram aqui ID, nome, e-mail, senha ou hash. O registro completo foi comparado apenas em memória antes/depois; o original permaneceu idêntico.

Preservados byte a byte na cópia: **ID, nome, e-mail, hash de senha, perfil, ativação, primeiro acesso, createdAt e updatedAt**. Não foi executado seed nem rehash da senha. A senha disponível na configuração privada local conferiu com o hash; foi utilizada apenas em memória no ensaio de login, sem redefinição, impressão ou gravação em relatório.

Dependências reais verificadas na restauração integral do backup:

| Referência ao administrador | Quantidade |
| --- | ---: |
| Médico (`usuarioId`, FK) | 0 |
| Paciente (`usuarioId`, FK opcional) | 0 |
| Código de redefinição de senha (FK) | 2 |
| Código de primeiro acesso (FK) | 0 |
| Auditoria de login (referência lógica, sem FK) | 45 |
| Auditorias de paciente, agenda e prontuário (referências lógicas) | 0 |

As quatro FKs para `usuario` foram inspecionadas. As auditorias também foram verificadas porque não possuem FK. Nenhum desses registros é necessário para preservar o login do ADMIN. **Códigos, auditorias e sessões antigas não serão transferidos**, conforme o descarte autorizado dos demais registros; permanecem recuperáveis pelo backup.

`versaoSessao` é um atributo novo em relação ao registro antigo. Na cópia preparada, foi inicializado em **1**, acima da geração antiga implícita 0. Se o campo já existir numa futura execução, o procedimento usa a versão anterior + 1. Isso impede que apagar o histórico de revogação torne cookies antigos novamente válidos. Não altera ID/e-mail/senha nem o administrador original. Todos deverão fazer novo login após a troca; autorizações clínicas antigas deixam de autorizar o acesso pelo middleware principal. Contas de médicos/pacientes antigas não existirão na nova base.

## Backup protegido e restauração integral

Backup final: `<DIRETORIO_PRIVADO_DE_BACKUPS>/principal.dump`.

Metadados privados: `resultado.json` na mesma pasta, sem senha, hash de senha ou tokens. Diretório com permissão **700**, arquivo de backup **600**, fora do repositório. Arquivo custom PostgreSQL com 106.360 bytes no ensaio. Checksum SHA-256 conferido; seu valor fica nos metadados privados. O dump contém informações sensíveis e não deve ser anexado ao TCC/Git/relatórios públicos. Permissões não equivalem a criptografia; para cópia externa, usar armazenamento criptografado e controle de acesso. Manter as configurações privadas existentes necessárias para descriptografar os prontuários do backup, sem colocá-las no Git.

`pg_dump` PostgreSQL 18 foi executado com conexão efetiva confirmada e `default_transaction_read_only=on`. O dump usa snapshot consistente do PostgreSQL. `pg_restore --list` conseguiu ler o arquivo, mas a validação não se limitou a isso: **o arquivo foi restaurado integralmente**, com `--exit-on-error --single-transaction`, em `tcc_preparacao_restore_20261022225507_ab620f`.

Restauração: 15 tabelas públicas, seis usuários, dois médicos, três pacientes, cinco prontuários e os demais históricos/códigos/disponibilidades. O administrador restaurado correspondeu exatamente ao original. Não houve cópia desses dados para o banco de testes.

O backup é do banco, não do cluster inteiro: roles/tablespaces externos não são recriados por ele. O ensaio foi no mesmo cluster local, com os roles existentes e restauração de ownership/ACL sem `--no-owner` ou `--no-acl`. Para recuperar em outro servidor, inventariar/recriar os roles autorizados e extensões antes; não afirmar que a restauração foi validada em AWS.

## Estrutura nova e migrações

Banco vazio final: **`tcc_preparacao_limpo_20261022225507_ab620f`**, criado exclusivamente para esta preparação, separado dos dois bancos existentes.

O CLI instalado do Prisma ORM 8 foi usado por `db migrate`, sem adaptações para Prisma convencional e sem `db push` ou SQL estrutural improvisado. Foi executado o grafo completo:

1. `20261022T0544_baseline`: vazio → contrato `89bfb590…`.
2. `20261022T0545_revogacao_sessao_logout`: → `8dad27b5…`, tabela/índices de revogação persistente.
3. `20261022T1758_versao_sessao_senha`: → `262d9014…`, versão de sessão do usuário.

Resultado: **16 tabelas públicas, 61 índices, 13 FKs, nenhuma restrição não validada**. `db update --dry-run` retornou **zero operações pendentes** em relação ao contrato atual. Contratos e snapshots existentes foram preservados. `jti` é claim JWT, não uma coluna. As correções de validação/consumo atômico de códigos e concorrência também dependem do código atualizado, não apenas do SQL.

Somente `usuario` recebeu uma linha: o administrador. As outras 15 tabelas da aplicação permaneceram vazias, inclusive códigos, auditorias, revogações, pacientes e prontuários. O serviço de login não gerou histórico clínico nem envio de e-mail.

## Restauração seletiva e acesso

O script `backend/scripts/preparar-recriacao-principal.mjs` extrai o administrador **da restauração do backup consistente**, confere contra a origem em memória, seleciona explicitamente as colunas compatíveis com o destino e insere apenas esse registro em transação. Valores sensíveis são enviados ao `psql` por stdin privado; nunca por argumento da linha de comando ou log. O script recusa escrita no nome `tcc_consultorio` e só grava em nomes descartáveis gerados internamente.

Após a inserção, executa no destino:

```sql
SELECT setval(
  pg_get_serial_sequence('public.usuario', 'id'),
  GREATEST((SELECT max(id) FROM public.usuario), 1),
  true
);
```

A sequência foi conferida: valor atual ≥ ID preservado e `is_called=true`, portanto a próxima inserção usa ID posterior. Não existe dependência clínica obrigatória a restaurar. Não reutilizar valores de sequência antigos de pacientes/médicos num banco vazio.

Validações realizadas com o código real no destino:

- Hash e senha atuais conferem, sem rehash/redefinição.
- `auth.service.login` autenticou o ADMIN e emitiu token válido, retido somente em memória.
- `authMiddleware` aceitou esse token e chamou `next`.
- Um token sintético de geração antiga 0, com assinatura, audiência, emissor e `jti` válidos, recebeu **401**, sem chamar `next`.
- O registro do administrador na origem permaneceu inalterado.

Não se iniciou o servidor habitual contra o principal nem se realizou login HTTP nele. O ensaio valida serviço e middleware no destino; a conferência visual pelo navegador será etapa pós-troca, sem gravar cookies em arquivos versionados. Nenhum e-mail real foi enviado.

## Comandos executados e reprodução segura

Os comandos abaixo são relativos à pasta `backend`, salvo indicação. Não imprimir ambiente ou usar `set -x`.

```sh
node --env-file=.env scripts/preparar-recriacao-principal.mjs
```

Esse comando cria **novos** bancos descartáveis e um novo backup privado a cada execução; não apaga ou migra o principal e não utiliza o banco de testes. Requer ferramentas PostgreSQL 18 do Postgres.app e permissão local para criar banco. Falha se houver múltiplos ADMINs, conta inelegível, conflito de nome, divergência de dados ou falha de migração. Não remove automaticamente os bancos em caso de erro. O teste de login depende de a credencial privada `ADMIN_SENHA` já existente conferir; se não conferir, a preparação não é considerada concluída e não se redefine senha.

Internamente foram usados `pg_dump --format=custom`, `pg_restore --list`, `pg_restore --exit-on-error --single-transaction`, `CREATE DATABASE`, consultas de catálogo em leitura e:

```sh
# Apenas com DATABASE_URL apontando em memória ao novo banco descartável:
node node_modules/prisma/dist/prisma.js db migrate --no-interactive
node node_modules/prisma/dist/prisma.js db update --dry-run --no-interactive
```

As conexões e credenciais foram passadas em ambiente privado dos processos, sem alteração de `.env`. A validação complementar de dependências, sequência e middleware foi executada somente nos dois bancos de ensaio, com resultado salvo em `resultado.json`. Também passaram `node --check backend/scripts/preparar-recriacao-principal.mjs` (na raiz) e o scanner de segredos atual, sem bloqueios. Os **330 testes são a referência aprovada anterior**; não foram reexecutados nem aumentados nesta tarefa de preparação. Código de aplicação não foi alterado.

## Etapa definitiva proposta — NÃO executada

Preferir uma troca de bancos previamente preparados em vez de apagar imediatamente o antigo. Isso atende à base nova com somente ADMIN e reduz o risco de perda durante a operação. A manutenção ainda exige autorização específica.

1. Parar backend, jobs e qualquer cliente que possa gravar no principal. Manter frontend em manutenção. Registrar versão de código/contratos a utilizar e verificar espaço em disco.
2. Fazer **novo backup após parar as escritas**, repetir restauração integral e preparação seletiva com o script acima. O backup de hoje não cobre alterações posteriores. Usar o novo nome de destino gerado, não presumir que o banco de ensaio de hoje continua atualizado.
3. Conferir um ADMIN, todos os atributos preservados, geração incrementada, outras tabelas vazias, sequência, migrações sem drift, hash/checksum privado e login+middleware. Guardar os resultados no diretório protegido.
4. Conferir roles, dono e permissões compatíveis com a aplicação. Não executar seed, não criar outro administrador nem substituir o hash.
5. Desconectar clientes e confirmar ausência de sessões nos dois bancos que serão renomeados. Conectar a `postgres`, nunca ao banco que será renomeado. Evitar encerramento forçado automático; se houver clientes desconhecidos, interromper a operação e investigar.
6. Renomear o principal antigo para um nome de preservação e o destino novo para `tcc_consultorio`. **Somente após nova autorização**, o SQL necessário terá a forma abaixo, substituindo os placeholders pelos nomes efetivamente validados:

```sql
-- FUTURO: conectado a postgres; aplicação parada; nomes conferidos.
ALTER DATABASE tcc_consultorio RENAME TO "NOME_ARQUIVO_ANTIGO_VALIDADO";
ALTER DATABASE "NOME_BANCO_NOVO_VALIDADO" RENAME TO tcc_consultorio;
```

Esses dois comandos não formam uma troca atômica única. Se o segundo falhar, restaurar imediatamente o nome original do banco antigo antes de iniciar o backend. Nenhum `DROP DATABASE`, `TRUNCATE` ou limpeza é necessário nessa estratégia. A exclusão futura do banco arquivado fica para decisão própria após período de retenção.

7. Com o nome original novamente disponível, iniciar o backend atualizado usando as configurações privadas atuais, sem alterar senha/chave. Validar contrato/marker, login visual do ADMIN, `/perfil`, autorização administrativa, logout e recusa de cookies antigos. Não reutilizar os cookies anteriores; fazer novo login com a mesma senha.
8. Confirmar ausência de contas/dados descartados no banco ativo e geração de auditoria somente das novas operações. Não disparar a suíte de testes/fixtures no principal. Registrar resultado e encerrar manutenção apenas após sucesso.

Janela de indisponibilidade: desde a parada dos escritores até verificações pós-troca; duração depende de tamanho do backup/restauração e não foi medida como SLA. Os bancos de ensaio pequenos não permitem extrapolar desempenho para produção.

## Recuperação em caso de falha

**Primeira opção:** parar a aplicação, manter ambos os bancos, renomear o banco novo para um nome de diagnóstico e devolver ao antigo o nome `tcc_consultorio`. Usar código compatível com o contrato antigo ou o par código/banco previamente validado; o banco antigo não contém as alterações recentes de sessões. Não iniciar o backend novo contra ele supondo compatibilidade plena. Não reduzir proteções para fazer o rollback funcionar.

```sql
-- FUTURO, somente com autorização e sem clientes conectados:
ALTER DATABASE tcc_consultorio RENAME TO "NOME_DIAGNOSTICO_FALHA_VALIDADO";
ALTER DATABASE "NOME_ARQUIVO_ANTIGO_VALIDADO" RENAME TO tcc_consultorio;
```

**Se o antigo estiver indisponível:** criar outro banco vazio, restaurar integralmente `principal.dump` com `pg_restore --exit-on-error --single-transaction`, validar o administrador e dados, e só então planejar a troca de nomes. Essa restauração integral já foi ensaiada; não restaurar por cima de um banco existente. Roles/ownership devem existir e as chaves privadas atuais precisam estar disponíveis para os registros clínicos recuperados. Manter o backup intacto e não reenviar códigos antigos de recuperação.

Após retomada de escritas no novo banco, voltar ao antigo perde as novas operações no banco ativo: preservar ambos, registrar a janela e decidir reconciliação antes do rollback. Não executar retorno automático após alterações de usuários.

## Arquivos e pendências

- Criado `backend/scripts/preparar-recriacao-principal.mjs`, ferramenta de preparação restrita, sem comandos destrutivos.
- Criado este relatório; backups/resultados privados e bancos descartáveis permanecem fora do versionamento.
- Nenhum arquivo de aplicação, contrato, migração, senha ou ambiente foi modificado nesta etapa.
- Nenhuma reescrita do Git ou operação remota foi executada. O risco histórico do JWT documentado anteriormente permanece uma questão separada.
- **Pronto tecnicamente para planejar a execução definitiva**, condicionado a nova autorização, manutenção, backup atualizado e repetição das verificações na ocasião. O banco principal atual permanece preservado e operacional como estava.
