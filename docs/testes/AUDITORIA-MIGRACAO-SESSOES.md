# Auditoria da migração de revogação — 22/10/2026

## Parecer e limites

O SQL é aditivo e compatível com o estado estrutural observado. **A implantação no banco principal não foi autorizada nem executada.** A auditoria não certifica prontidão para implantação: backup, restauração de ensaio e permissões de implantação ainda são portas de aprovação futuras; o plano efetivo precisa ser reconferido na janela autorizada.

Foi realizada somente consulta de metadados no PostgreSQL local `tcc_consultorio`, com `default_transaction_read_only=on`, `BEGIN READ ONLY`, timeout de cinco segundos e encerramento por `ROLLBACK`. O próprio servidor confirmou `transaction_read_only=on` e versão 18.6. Não foram consultadas linhas de usuário, paciente, agendamento ou prontuário; não houve dump, cópia, seed, mudança de assinatura, DDL ou escrita de aplicação no principal.

Foram comparadas **15 tabelas e 122 colunas** do principal com o snapshot anterior `89bfb590...`: nomes previstos presentes e nenhuma diferença de tipo/nulabilidade. `sessaoRevogada` não existe no principal. Na segunda leitura de metadados, também foram conferidos defaults das 122 colunas, 37 índices explícitos, 15 PKs, seis unicidades e 13 FKs, sem divergências nas definições comparadas. Os três CHECKs de enum possuem os mesmos conjuntos de valores; não foi executada análise formal de equivalência de expressões SQL arbitrárias. A assinatura `prisma_contract.marker.core_hash` coincide com o snapshot anterior `89bfb590...`. As permissões do executor/aplicação não foram exercitadas por escrita. Tudo deve ser reconferido no plano final antes de qualquer aplicação autorizada.

## SQL e compatibilidade com dados existentes

O pacote `backend/migrations/app/20261022T0545_revogacao_sessao_logout/ops.json` contém somente criação de `public.sessaoRevogada`, índice de `expiresAt` e índice de `usuarioId`. A PK `tokenHash` também cria seu índice único. Não há ALTER, DROP, UPDATE de dados, backfill ou alteração de FKs existentes. A tabela começa vazia; os campos NOT NULL não precisam ser preenchidos em registros de outras entidades. Não é necessário examinar dados pessoais ou copiar registros para testes para avaliar essa propriedade.

A tabela guarda SHA-256 do JWT, ID do responsável, expiração e criação. O hash do token tem alta entropia e o JWT em texto não é persistido. Não há FK para usuário: excluir médico/paciente mantém suas regras anteriores e uma revogação pode continuar existindo até expirar. O índice de usuário apoia consultas/limpezas restritas às fixtures, e o de expiração prepara manutenção futura; cada índice acrescenta custo pequeno de escrita e espaço.

A criação dos índices ocorre na tabela nova, inicialmente vazia. `CREATE INDEX` normal bloqueia escritas na tabela alvo, portanto deve terminar antes de liberar o backend novo; não é necessário trocar por `CONCURRENTLY` neste caso. Isso não justifica garantir ausência absoluta de bloqueios: catálogos, assinatura do Prisma, DDL concorrente e transações longas ainda exigem observação na janela. [Documentação de locks do PostgreSQL](https://www.postgresql.org/docs/18/explicit-locking.html).

O plano efetivamente aplicado no banco de testes continha exatamente as três operações aditivas. Uma diferença adicional no principal deve impedir a execução automática e ser analisada separadamente. O hash de contrato novo é `8dad27b5f0b55a650673e13ae3b9cd8f56d04008c201371e35ea27f50b902c02`.

A baseline `20261022T0544_baseline` foi criada pelo CLI para representar o estado inicial do grafo; **não deve ser reproduzida para recriar tabelas existentes**. Não executar `db migrate` indiscriminadamente. O procedimento documentado utiliza planejamento contra a estrutura efetiva e atualização aditiva, sem opções para confirmar destruição. Aplicar apenas o SQL manualmente também é insuficiente: o ORM exige assinatura alinhada ao contrato.

## Sessões e ordem de implantação

JWTs anteriores sem `jti` passam a receber 401 e exigem novo login. Nenhuma senha, perfil, vínculo ou prontuário precisa ser alterado. A autorização clínica anterior também não serve sem uma sessão principal aceita. Novos logins possuem identificadores únicos; logout encerra só aquela sessão e a revogação continua válida em outros processos/reinicializações.

A sequência futura deve ser: autorizar a manutenção, suspender entradas/escritas e drenar requisições em andamento; validar backup; verificar banco e plano; aplicar somente a alteração aditiva e assinatura; iniciar **todos** os processos com a versão corrigida; verificar login/logout sem testes de escrita no principal; reabrir acesso. Não misturar processos antigos e novos: o antigo ignora a tabela de revogação. O código novo com esquema/assinatura antigos pode bloquear autenticação com erro de infraestrutura.

Se a consulta da revogação falhar, o middleware responde 503 sem liberar acesso. Se a gravação falhar, logout não informa sucesso; a interface preserva a sessão e permite nova tentativa. A nova consulta indexada ao banco faz parte do caminho de cada requisição autenticada; não existe cache local que permita reutilização.

## Backup — procedimento proposto, não executado

Definir responsável, janela, RPO/RTO, diretório privado fora do Git e orçamento de armazenamento. Confirmar o banco efetivo e a versão dos utilitários; utilizar cliente compatível com PostgreSQL 18. Usar credenciais por serviço/arquivo protegido, sem senha em argumentos ou relatórios.

Após autorização específica, a forma de referência é `pg_dump --format=custom --file=<arquivo-privado.dump> --dbname=service=<servico-principal>`. O dump deve abranger **todo o banco**, incluindo esquema/metadados `prisma_contract`, não apenas tabelas de negócio. O PostgreSQL produz snapshot consistente; pg_dump não inclui objetos globais como roles/tablespaces, que exigem inventário/procedimento separado. [Documentação de pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html).

O arquivo contém dados sensíveis, ainda que o conteúdo clínico seja criptografado pela aplicação: acesso mínimo, armazenamento criptografado e retenção definida. Registrar somente data, versão, tamanho, checksum e resultado da ferramenta. Guardar chaves de criptografia clínica e configurações necessárias à recuperação separadamente, em armazenamento protegido; sem a chave, restaurar o banco pode não permitir ler prontuários. Não publicar senhas, hashes de senha, JWTs, arquivos de ambiente ou dumps.

`pg_restore --list <arquivo-privado.dump>` inspeciona o catálogo do arquivo e não restaura dados; essa inspeção **não prova** restauração integral. A aceitação do backup requer ensaio de restauração em ambiente segregado e restrito, com autorização própria para tratar dados reais. Nunca restaurar esse backup no banco principal por ensaio, no banco `tcc_consultorio_testes`, em CI ou em serviço remoto durante esta missão. Nesta etapa, nem backup nem ensaio foram executados; não há backup validado a apresentar.

## Reversão que preserva segurança

1. Se a pré-verificação ou backup falhar, não iniciar aplicação de estrutura. Manter estado atual e registrar a decisão.
2. Se houver erro durante DDL/assinatura, manter acesso suspenso e conferir estado efetivo/assinatura. Não presumir rollback global do CLI sem confirmação. Se a transação falhou e reverteu, nada deve ser apagado; se houve estado parcial, preferir concluir as operações aditivas faltantes após revisão.
3. Se houver erro depois de abrir a aplicação, suspender acesso e preferir correção adiante ou versão compatível que **também consulte a revogação**. Preservar tabela e seus registros, inclusive se outras alterações de código forem revertidas.
4. **Não retornar ao backend vulnerável como rollback de serviço.** Ele aceitaria JWTs já revogados, mesmo mantendo a tabela. Não apagar tabela, remover revogações não expiradas ou restaurar um snapshot que as perca mantendo os mesmos JWTs válidos.
5. Uma restauração completa é último recurso, exige nova autorização, plano de perda das escritas posteriores ao snapshot e destino controlado. Antes de reabrir o acesso, reconciliar esquema/assinatura e revogações; se registros de revogação não puderem ser preservados, invalidar todas as sessões com rotação coordenada do segredo JWT e reiniciar todos os processos com a correção. Não confundir esse segredo com a chave de criptografia dos prontuários.

Não há SQL de DROP nem executor de reversão destrutiva criado nesta auditoria. Limpeza futura de revogações deve remover somente entradas efetivamente expiradas, considerando sincronização de relógios e margem operacional; não foi implementada nesta etapa.

## Riscos e condições para futura autorização

| Risco | Condição de liberação |
| --- | --- |
| Drift entre estrutura principal e contrato anterior | Comparação completa, assinatura e plano com somente três operações previstas |
| Backup ausente ou restauração não ensaiada | Backup privado validado e ensaio segregado autorizado |
| Sessões antigas recusadas | Comunicar necessidade de novo login e novo desbloqueio clínico |
| Processos antigos aceitando tokens revogados | Suspender versão antiga e iniciar somente instâncias corrigidas |
| DDL ou assinatura parcialmente aplicados | Verificar estrutura/assinatura antes de abrir acesso; não improvisar limpeza |
| Retorno à versão vulnerável/perda de revogações | Manter proteção, preferir correção adiante; invalidar sessões se necessário |
| Crescimento da tabela e custo por requisição | Monitorar latência e volume; definir manutenção segura de expirados |
| Permissões insuficientes ou excessivas | DDL por identidade autorizada; aplicação com SELECT/INSERT compatíveis com upsert |

Conclusão: **plano estruturalmente aditivo, com compatibilidade estrutural e assinatura anterior conferidas por metadados; implantação continua condicionada e não executada**. A auditoria não modifica a suíte: a referência permanece em 81 testes aprovados antes da nova expansão.
