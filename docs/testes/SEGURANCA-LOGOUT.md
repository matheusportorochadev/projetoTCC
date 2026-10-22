# SEG-01 — autorização clínica reutilizável após logout

Situação: correção autorizada pelo usuário, implementada e validada exclusivamente em `tcc_consultorio_testes`. A aplicação no banco principal continua sem autorização e não foi realizada. Relatório: [CORRECAO-REVOGACAO-SESSOES.md](CORRECAO-REVOGACAO-SESSOES.md).

## Evidência e impacto

O teste `Logout invalida no servidor a autorização clínica anteriormente emitida`, em `frontend/tests/api-prontuarios-cadastro-isolado.spec.ts`, usa somente conta fictícia exclusiva no banco `tcc_consultorio_testes` e processo HTTP isolado.

1. Autentica o médico fictício.
2. Cadastra e verifica uma senha clínica gerada para o teste.
3. Conserva em memória os dois cookies recebidos.
4. Executa `POST /auth/logout`, que retorna 200.
5. Confirma que o contexto, agora sem cookies, recebe 401 em `/perfil`.
6. Reenvia os cookies conservados para `GET /prontuarios/acesso/sessao`.

Resultado anterior à correção: **HTTP 200**. Critério G24: a autorização emitida deveria deixar de valer após logout; a expectativa aceita 401 ou 403. Com a correção, o teste passou sem alterar sua expectativa, sem ser ignorado e sem ser marcado como falha esperada.

Gravidade estimada: **média**, condicionada à posse prévia dos dois cookies válidos; o impacto potencial envolve acesso clínico após o usuário encerrar a sessão. Não é acesso anônimo, não contorna a senha clínica sem tokens previamente emitidos e não demonstra invasão de contas. A janela é limitada pelas expirações dos tokens e pelos demais controles existentes.

Não há cookies, senhas ou JWTs neste documento. O teste desativa trace para este arquivo e anexa somente rota e status HTTP. Screenshots/traces dos testes de interface mantêm a configuração original.

## Causa

`backend/src/controllers/auth.controller.ts`, função `logoutController`, valida o JWT para identificar a auditoria, remove os cookies principal e clínico e registra logout. Não mantém revogação da sessão no servidor.

`backend/src/middlewares/auth.middleware.ts` verifica assinatura, validade e situação atual do usuário. O middleware clínico verifica vínculo criptográfico com o mesmo JWT principal e versão da credencial. Como o logout não modifica nenhum desses estados, os cookies anteriores continuam válidos quando reapresentados.

A emissão principal anterior em `backend/src/services/auth.service.ts` também não especificava `jwtid`. Agora cada login tem UUID aleatório, e um teste com relógio fixo confirma identificadores e JWTs diferentes para logins emitidos no mesmo segundo.

## Proposta aprovada e implementada

Implementar revogação persistida **por sessão**, preservando outras sessões do mesmo usuário:

- Emitir identificador aleatório `jti` em cada login.
- Criar entidade de revogação com identificador único ou hash do token e prazo de expiração; nunca persistir JWT em texto.
- No logout com token válido, persistir a revogação de forma idempotente antes de informar sucesso; manter remoção de cookies inválidos/expirados.
- Consultar revogação no middleware principal, impedindo automaticamente a reutilização clínica vinculada àquela sessão.
- Definir explicitamente o erro de indisponibilidade da persistência: não informar sucesso de revogação que não foi confirmada.
- Usar alteração aditiva do contrato e estrutura exclusiva de testes para validar; não aplicar migração no banco principal nesta missão sem autorização específica.
- Preservar auditoria sem informações secretas e tratar logout repetido.

Validação prevista: teste atual aprovado; repetição do token principal também rejeitada; outra sessão do mesmo médico preservada; logins no mesmo segundo com IDs diferentes; logout repetido idempotente; tokens expirados/ausentes sem erro interno; integração e interface existentes preservadas; rollback em falha da persistência.

Não foi implementada revogação global por médico, pois isso também encerraria autorizações clínicas de outros dispositivos e alteraria uma regra não definida pelo usuário.

## Autorização necessária

O usuário exigiu aprovação antes de “alterações sensíveis nas regras do sistema” (instruções finais da missão) e proibiu mudar regras de negócio para fazer testes passarem (seção 24). A correção afeta emissão, persistência e validação das sessões; por isso é apresentada para aprovação antes de alterar o código de autenticação ou a estrutura dos bancos.

## Validação final da correção

`npm run test:all` aprovado: 8 testes backend, 16 de interface e 57 de integração; total 81 aprovados, zero reprovados e zero ignorados. TypeScript backend e build frontend aprovados. A revogação persiste após reinicialização, outra sessão continua válida e o teste original foi preservado. A mudança foi autorizada explicitamente em 22/10/2026 com aplicação de estrutura restrita ao banco de testes.
