# Recriação definitiva do banco principal — 22/10/2026

## Resultado

**Concluída com sucesso, conforme autorização explícita.** O nome `tcc_consultorio` agora aponta para um banco novo com a estrutura atual do Prisma ORM 8 e exclusivamente o administrador original. Seu ID, nome, e-mail, hash de senha, perfil ADMIN, ativação, primeiro acesso e datas foram preservados. Senha não alterada, redefinida, regravada ou exposta.

O banco antigo foi **preservado por renomeação**, não apagado. Não houve `DROP DATABASE`, `TRUNCATE`, limpeza de tabelas, execução da suíte de fixtures no principal ou alteração de `tcc_consultorio_testes`. Código frontend/backend, contratos, migrações e arquivos `.env` não foram alterados nesta execução. Não houve commit, push, deploy ou operação remota.

## Pré-condições verificadas

- URL local conferida em memória e conexão efetiva PostgreSQL exatamente `tcc_consultorio`.
- Um único ADMIN elegível; seis usuários na base anterior.
- **Zero outras conexões** no principal nas verificações prévias. Nenhuma sessão foi terminada à força.
- Sem backend ouvindo na porta 3000; o processo frontend existente foi identificado e preservado. Não foi necessário parar processos backend de terceiros.
- Backup anterior íntegro e restaurado; procedimento de recuperação disponível no relatório de preparação.
- Novo backup consistente produzido e restaurado integralmente antes da troca, evitando depender apenas do ensaio anterior.
- Administrador extraído da restauração consistente e comparado com a origem, sem divergência.
- Banco novo com migrações, sequência, login, middleware e estrutura conferidos antes de promoção.
- Dono, ACL, encoding, collation, ctype e tablespace compatíveis entre principal antigo e destino novo.
- Nome de arquivo do banco antigo disponível, destino confirmado e ausência de clientes novamente conferida antes da renomeação.

Para impedir conexões novas na janela da troca, `ALLOW_CONNECTIONS` foi temporariamente desativado no principal e no destino preparado. A ausência de sessões foi novamente confirmada após o bloqueio. Somente o principal novo foi reaberto ao final; o banco arquivado permanece fechado a novas conexões.

## Backup atualizado e preservação do administrador

Diretório privado, fora do Git:

`<DIRETORIO_PRIVADO_DE_BACKUPS>/`

- `principal.dump`: backup completo em formato custom do PostgreSQL, criado com conexão de origem somente de leitura e snapshot consistente.
- `resultado.json`: resultados sanitizados da preparação e checksum do backup.
- `execucao-definitiva.json`: registro das pré-condições, fases da troca e verificações posteriores.
- `validacao-http.json`: resultados HTTP sanitizados.

Diretório com permissão **700**, dump com **600**. Checksum SHA-256 do dump confirmado antes da promoção; nenhum hash de senha ou segredo consta deste documento. O backup foi efetivamente restaurado com `pg_restore --exit-on-error --single-transaction` em:

`tcc_preparacao_restore_20261022230033_f43bd6`

A restauração contém os dados anteriores completos; a igualdade do administrador foi conferida em memória. Os backups e bancos de ensaio anteriores não foram removidos. Permissões locais não equivalem a criptografia: eventual cópia externa deve usar armazenamento protegido. As configurações privadas existentes, inclusive chaves necessárias para ler registros clínicos antigos, continuam preservadas e fora do Git.

## Migrações e restauração seletiva executadas

O script de preparação previamente validado foi executado novamente, sem alteração:

```sh
# Executado na pasta backend, sem imprimir o ambiente:
node --env-file=.env scripts/preparar-recriacao-principal.mjs
```

Ele criou o banco vazio `tcc_preparacao_limpo_20261022230033_f43bd6` e executou o CLI instalado:

```sh
# DATABASE_URL do processo direcionada apenas ao banco novo preparado:
node node_modules/prisma/dist/prisma.js db migrate --no-interactive
node node_modules/prisma/dist/prisma.js db update --dry-run --no-interactive
```

Foram aplicadas, nesta ordem:

1. `20261022T0544_baseline`.
2. `20261022T0545_revogacao_sessao_logout`.
3. `20261022T1758_versao_sessao_senha`.

Contrato final: `262d9014…`. Nenhuma migração foi improvisada sobre a estrutura antiga. A consulta posterior de atualização em dry-run retornou zero operações tanto antes quanto depois da troca.

Somente a linha do ADMIN foi inserida no banco novo, em transação. Os valores foram enviados ao PostgreSQL por stdin privado, sem argumentos contendo credenciais e sem impressão. A sequência de `usuario.id` foi ajustada com `setval(pg_get_serial_sequence(...), max(id), true)` e conferida, garantindo que a próxima inserção receba ID posterior ao preservado.

`versaoSessao` foi inicializada em **1**, acima da geração antiga implícita 0. Esse é o único atributo de segurança novo da conta; não altera sua senha nem seu acesso após novo login. A renovação impede que a ausência das revogações antigas na nova base torne cookies anteriores novamente válidos. Códigos de primeiro acesso/recuperação e autorizações clínicas anteriores não foram transferidos.

## Troca definitiva executada

O registro da operação começou às **23:02:04 UTC (20:02:04 em São Paulo)** e concluiu as verificações estruturais/de acesso às **23:02:09 UTC**. Esse intervalo inclui verificações prévias e posteriores, não é uma medição isolada de indisponibilidade.

Conectado ao banco de manutenção `postgres`, foram executados os comandos abaixo na sequência controlada. **São registro histórico, não instruções para repetir.**

```sql
ALTER DATABASE tcc_consultorio ALLOW_CONNECTIONS false;
ALTER DATABASE tcc_preparacao_limpo_20261022230033_f43bd6 ALLOW_CONNECTIONS false;
-- Nova conferência de zero conexões nos dois bancos.
ALTER DATABASE tcc_consultorio
  RENAME TO tcc_consultorio_anterior_20261022230033_f43bd6;
ALTER DATABASE tcc_preparacao_limpo_20261022230033_f43bd6
  RENAME TO tcc_consultorio;
ALTER DATABASE tcc_consultorio ALLOW_CONNECTIONS true;
```

As duas renomeações não constituem uma troca atômica única; a execução incluiu recuperação por renomeação em caso de falha intermediária. Nenhuma recuperação foi necessária. O banco antigo permanece em:

**`tcc_consultorio_anterior_20261022230033_f43bd6`**, com novas conexões bloqueadas.

## Verificação estrutural e integridade

Resultados confirmados no principal novo:

| Verificação | Resultado |
| --- | --- |
| Conexão efetiva | `tcc_consultorio` |
| Tabelas públicas | **16** |
| Índices públicos | **61** |
| Chaves estrangeiras | **13** |
| Restrições não validadas | **0** |
| Índices inválidos | **0** |
| Operações pendentes no dry-run Prisma | **0** |
| Usuários / administradores | **1 / 1** |
| Sequência de usuário | Posterior ao ID preservado na próxima inserção |
| Atributos originais do administrador | Preservados |

Imediatamente após a promoção, as outras 15 tabelas da aplicação estavam vazias. Médicos, pacientes, disponibilidades, consultas, remarcações, prontuários, códigos e históricos fictícios antigos estão ausentes da base ativa. Esses dados continuam somente no arquivo antigo e nos backups/ensaios privados preservados.

## Validação do backend e acesso

Primeiro foram exercitados serviço real de login e middleware antes/depois da promoção, sem alterar o usuário. Depois o **backend Express real** foi iniciado contra `tcc_consultorio`, em porta temporária, e recebeu as seguintes requisições HTTP:

| Verificação | Resultado |
| --- | --- |
| Backend inicia com a estrutura atual | Aprovado |
| Login com e-mail/senha originais | **200** |
| Cookie principal HttpOnly | Presente |
| JWT/hash de senha no JSON de login | Ausentes |
| `/perfil` com sessão nova, ID/perfil originais | **200** |
| `/admin` com sessão nova | **200** |
| `/perfil` com geração antiga assinada, jti/emissor/audiência válidos | **401** |
| Sessão clínica com a sessão principal antiga | **401** |
| Logout da sessão de validação | **200** |
| Reapresentação manual do cookie encerrado | **401** |
| Mesmo cookie encerrado após reiniciar o backend | **401** |
| Registro do ADMIN antes/depois das requisições | Idêntico |

Senha e tokens foram utilizados exclusivamente em memória. Não houve redefinição, envio de e-mail, coleta de trace/screenshot autenticado ou impressão de corpos/headers sensíveis. Não foi executada a suíte automatizada que prepara/remove fixtures no principal.

As requisições HTTP legítimas criaram **dois registros novos de auditoria de login e uma revogação persistente**. Por isso essas duas tabelas deixaram de estar vazias depois do teste operacional; não são dados antigos restaurados nem alteração no administrador. Contagem final: um usuário ADMIN e zero médicos, pacientes, prontuários, consultas ou disponibilidades.

As duas instâncias temporárias do backend foram encerradas após a validação. Não havia backend normal em execução antes e nenhum foi deixado rodando por esta operação. Para usar o sistema, iniciar normalmente o backend com a configuração atual e realizar **novo login com as mesmas credenciais**. O frontend preexistente não foi modificado. Não foi realizado teste visual de navegador nesta operação.

## Recuperação disponível

Não houve falha na operação ou nas verificações obrigatórias. O banco antigo e o backup íntegro permanecem disponíveis. Não excluir nenhum deles automaticamente.

Se houver falha posterior, parar o backend/escritores, conferir os nomes e garantir ausência de clientes. Preservar o banco novo para diagnóstico; não restaurar um dump por cima dele. A forma prevista de retorno, conectada a `postgres`, é:

```sql
-- Recuperação futura: somente após avaliar novas escritas e obter autorização.
ALTER DATABASE tcc_consultorio ALLOW_CONNECTIONS false;
-- Conferir zero conexões; não encerrar clientes desconhecidos à força.
ALTER DATABASE tcc_consultorio RENAME TO "NOME_DIAGNOSTICO_FALHA_VALIDADO";
ALTER DATABASE tcc_consultorio_anterior_20261022230033_f43bd6
  RENAME TO tcc_consultorio;
ALTER DATABASE tcc_consultorio ALLOW_CONNECTIONS true;
```

O banco antigo usa a estrutura anterior. Um retorno exige código compatível com aquele contrato; não iniciar o backend atualizado contra ele presumindo compatibilidade. Se o arquivo antigo não estiver disponível, restaurar o dump integral num terceiro banco vazio, verificar administrador/integridade e planejar a troca. Roles e configurações privadas existentes precisam estar disponíveis. A restauração integral foi ensaiada no mesmo cluster local, não em AWS.

Novas escritas no principal atualizado não existem no banco antigo: antes de qualquer rollback futuro, preservar ambas as bases e avaliar reconciliação. Não zerar gerações/revogações para recuperar acesso nem reativar códigos antigos.

## Restrições e ressalvas finais

- Banco de testes não foi conectado ou modificado nesta execução.
- Nenhum arquivo de frontend/backend ou `.env` foi alterado. A orquestração e verificação HTTP usaram scripts temporários fora do projeto; somente este relatório foi criado no repositório nesta etapa.
- Os 330 testes aprovados anteriormente não foram reexecutados no principal e não são apresentados como execução desta etapa. Foram feitas as verificações direcionadas de integridade e compatibilidade acima.
- Backup, banco antigo e bancos de ensaio ocupam espaço; eventual exclusão fica para decisão separada após retenção/revisão.
- O banco antigo foi arquivado, não fisicamente destruído. Somente o ADMIN existe como usuário da aplicação na base ativa.
- Histórico Git com JWT expirado, já documentado, é uma questão separada; não houve reescrita de histórico.
- Sem erros ou ressalvas que impeçam o uso da estrutura atual. É necessário iniciar o backend normal e entrar novamente com as credenciais existentes.
