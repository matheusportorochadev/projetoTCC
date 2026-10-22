# Aplicação futura da revogação no banco principal — não executada

**Complemento de 22/10/2026:** o backend local agora também exige a coluna aditiva `Usuario.versaoSessao`, usada na revogação após redefinição de senha. O SQL, o novo hash de destino e a implantação/reversão conjunta estão em [CORRECAO-SEIS-DEFEITOS.md](CORRECAO-SEIS-DEFEITOS.md). O procedimento abaixo documenta a primeira migração; aplicar somente ela não basta para iniciar o contrato atual. Nenhuma das duas foi aplicada ao principal nesta etapa.

A autorização atual cobre exclusivamente `tcc_consultorio_testes`. Nada deste procedimento foi executado em `tcc_consultorio` ou em produção. O executor `scripts/aplicar-revogacao-testes.mjs` é exclusivo dos testes e bloqueia qualquer outra conexão.

Auditoria posterior, somente leitura: [AUDITORIA-MIGRACAO-SESSOES.md](AUDITORIA-MIGRACAO-SESSOES.md), incluindo compatibilidade estrutural, backup, reversão e riscos. Nenhuma migração foi aplicada ao principal.

## Estrutura a acrescentar

O contrato novo mantém todas as entidades existentes e acrescenta somente:

```sql
CREATE TABLE "public"."sessaoRevogada" (
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "tokenHash" text NOT NULL,
  "usuarioId" int4 NOT NULL,
  PRIMARY KEY ("tokenHash")
);
CREATE INDEX "sessaoRevogada_expiresAt_idx_6b6b8c10"
  ON "public"."sessaoRevogada" ("expiresAt");
CREATE INDEX "sessaoRevogada_usuarioId_idx_5f01c7d6"
  ON "public"."sessaoRevogada" ("usuarioId");
```

Este SQL é referência de revisão, não um executor automático: o Prisma 8 também exige atualizar a assinatura do contrato. Não há FK para usuário; isso preserva as regras existentes de exclusão e evita relacionamentos novos nas entidades de negócio. Não são armazenados JWT, senha, hash de senha ou conteúdo clínico.

Hash do contrato anterior: `89bfb590e757f4f0ef44a470c533f4e277206821b41f0cfc75fa90fe25a195a6`.

Hash do contrato de destino: `8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02`.

Pacote gerado pelo Prisma: `backend/migrations/app/20261022T0545_revogacao_sessao_logout/`. O CLI também gerou `20261022T0544_baseline` para representar o estado anterior no grafo vazio. **Essa baseline não deve ser reproduzida para recriar tabelas de um banco existente.** Na aplicação realizada em testes, foi usado `db update` com inspeção da estrutura efetiva e apenas três operações aditivas; a baseline não recriou o banco.

## Procedimento somente após nova autorização

1. Registrar a autorização específica para o banco principal, revisar o plano e providenciar backup apropriado no procedimento de manutenção autorizado. Usar a conexão do ambiente desejado sem imprimir credenciais.
2. Confirmar `SELECT current_database()` na conexão efetiva. A operação principal só poderá ser feita se o resultado corresponder ao banco explicitamente autorizado.
3. Conferir se o contrato anterior corresponde à estrutura daquele banco; não presumir que alterações locais anteriores já foram aplicadas.
4. Com o CLI já instalado, na pasta `backend`, visualizar sem aplicar:

   ```sh
   node node_modules/prisma/dist/prisma.js db update --to 8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02 --dry-run --no-interactive
   ```

   O CLI carregará a conexão configurada. A configuração deve ser revisada antes do comando. Exigir que o resultado contenha somente a nova tabela e os dois índices acima; qualquer outra diferença exige análise e aprovação própria.

5. Após revisão do plano e autorização vigente, o mesmo comando sem `--dry-run` aplica a diferença aditiva e atualiza a assinatura do Prisma. Não usar opções de confirmação de operações destrutivas. Não copiar a estrutura inteira de testes, nem dados fictícios, pacientes ou prontuários.
6. Conferir tabela, índices e assinatura. Só então iniciar o backend que utiliza o contrato novo. Código novo com esquema antigo não deve ser colocado em uso.
7. Exigir novo login das sessões anteriores à atualização: JWTs sem `jti` são rejeitados. Essa transição não muda senhas nem os perfis ou cadastros. A partir daí, logout encerra exclusivamente a sessão atual.
8. Fazer verificação controlada do ambiente autorizado sem executar a suíte com escrita contra o banco principal. A suíte automatizada continua exclusiva do banco isolado.

## Retenção e operação

Os registros de revogação são necessários somente até a expiração do JWT correspondente (atualmente até oito horas). Uma tarefa de manutenção futura poderá remover registros expirados em lotes, usando o índice `expiresAt`; ela não foi instalada nem executada nesta entrega. Nenhuma limpeza é realizada durante requisições autenticadas.

Não retirar um registro antes da expiração do token: isso poderia reautorizar um JWT revogado. Em caso de problema, não resolver removendo a tabela enquanto o backend novo estiver em uso. Suspender o acesso e analisar um plano de recuperação que preserve as revogações já confirmadas.
