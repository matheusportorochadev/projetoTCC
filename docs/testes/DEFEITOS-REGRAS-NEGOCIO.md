# Defeitos reproduzidos nas regras de negócio — 22/10/2026

Os três casos abaixo foram reproduzidos primeiro em baterias focadas e novamente na execução completa. Nenhuma expectativa foi relaxada, nenhum caso foi ignorado e não houve alteração nas regras da aplicação nesta etapa. Todas as requisições e escritas ocorreram exclusivamente em `tcc_consultorio_testes`, com fixtures fictícias próprias removidas no encerramento.

## NEG-01 — unicidade de CPF contornada por máscara

Gravidade estimada: média, por integridade de identificação e risco de fragmentação de históricos. Não foi demonstrado acesso horizontal indevido; esses testes de autorização passaram.

Reprodução: médico autenticado cadastra paciente com CPF fictício de 11 dígitos; cadastra outro paciente com os mesmos dígitos no formato pontuado. Primeiro retorno 201; segundo retorno **201**, quando deveria rejeitar a duplicação. CPF exatamente igual é corretamente rejeitado com 400.

Teste: `frontend/tests/api-pacientes-negocio.spec.ts`, cenário `CPF com e sem máscara identifica a mesma pessoa e não permite duplicação`.

Causa: `backend/src/schemas/paciente.schema.ts` conta os dígitos para validar estrutura, mas não normaliza o valor persistido. `criarPaciente` e `atualizarPaciente`, em `backend/src/services/paciente.service.ts`, aplicam somente `trim()`. Tanto a consulta de duplicidade quanto o UNIQUE do PostgreSQL comparam strings diferentes.

Correção proposta: definir representação canônica de 11 dígitos em criação e atualização, mantendo a validação estrutural já estabelecida. Antes de adaptar dados existentes, levantar duplicidades normalizadas em procedimento separado e autorizado, definir resolução sem apagar vínculos ou históricos e só então planejar a normalização dos registros. Não adicionar regra matemática de CPF ou juntar pacientes automaticamente para fazer o teste passar. Nenhum CPF real foi consultado e nenhuma normalização foi executada no principal.

## NEG-02 — paciente consegue agendar em data passada

Gravidade estimada: média, por integridade do calendário e inconsistência de agendamentos.

Reprodução: médico configura disponibilidade histórica fictícia em `2000-01-01`; paciente vinculado solicita `08:00` nessa data. A configuração de períodos históricos é aceita pela implementação atual; a solicitação da consulta retorna **201**, quando a regra F17 exige rejeição (teste espera 400).

Teste: `frontend/tests/api-agendamentos-negocio.spec.ts`, cenário `Paciente não agenda no passado mesmo quando existe disponibilidade histórica`.

Causa: `agendarConsulta`, em `backend/src/controllers/agendamento.controller.ts`, consulta o slot e chama `criarAgendamento`. O service verifica formato de data/horário e conflitos dentro da transação, mas não compara a data com o dia atual nesse fluxo. A criação manual pelo médico e a remarcação direta já possuem guarda de data passada.

Correção proposta: aplicar a regra temporal também ao fluxo de solicitação do paciente, preferencialmente em um ponto central do service, com erro de domínio traduzido para 400. Conferir o fluxo de pedido de remarcação do paciente, que também necessita auditoria temporal própria. Não proibir períodos históricos ou alterar o significado de estados apenas para contornar o teste. Nenhuma regra de datas foi modificada nesta etapa.

## NEG-03 — disputa de slot retorna erro interno em vez de conflito

Gravidade estimada: média para confiabilidade da API e tratamento de erros. **Não houve duplicação de consultas no cenário executado.**

Reprodução: dois pacientes do mesmo médico enviam simultaneamente solicitação para o mesmo slot. O teste faz três pares, em slots distintos, sem sleeps ou carga pesada. A evidência da execução completa foi:

```json
{"status":[[201,409],[201,500],[201,500]],"consultasPersistidas":3}
```

Houve uma consulta por slot, mas duas respostas perdedoras foram **500**. A expectativa permanece `[201, 409]` em cada par. A disputa não exige um resultado fixo sobre qual paciente ganha.

Teste: `frontend/tests/api-concorrencia-negocio.spec.ts`, cenário `Duas solicitações simultâneas para o mesmo slot criam uma consulta e retornam conflito controlado`.

Causa pelo fluxo de código: o conflito detectado antes de entrar no service retorna 409; se for detectado dentro de `criarAgendamento`, a exceção de domínio chega ao `catch` genérico de `agendarConsulta`, que retorna 500. O service já utiliza transações SERIALIZABLE com tentativas limitadas. Não foi instrumentado o SQL interno de cada disputa; a conclusão de ausência de duplicação vem da inspeção dos registros da própria fixture após os três pares.

Correção proposta: traduzir explicitamente conflitos esperados de disponibilidade para HTTP 409 no controller, preservando validação de médico, transação, tentativas e auditoria. Erros efetivamente internos/indisponibilidade precisam continuar distinguíveis. Não aceitar 500 no teste nem retirar a proteção transacional.

## Situação da correção

Na entrega inicial foram implementados testes e propostas; a execução de 173 testes registrou 170 aprovações e três falhas reais, preservadas acima como evidência histórica.

**Atualização após correção:** NEG-01, NEG-02 e NEG-03 foram corrigidos e os testes originais passaram sem alteração de expectativas. A suíte completa agora registra **178 aprovados, zero reprovados e zero ignorados**, incluindo cinco complementos. A revogação SEG-01 continua aprovada. Não houve migração ou normalização em massa de dados existentes. Consulte [CORRECAO-DEFEITOS-REGRAS-NEGOCIO.md](CORRECAO-DEFEITOS-REGRAS-NEGOCIO.md) para implementação, arquivos, limitações e validação.
