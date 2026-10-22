# Defeitos encontrados na consolidação — 22/10/2026

**Atualização posterior:** a correção visual de UI-PA-01 foi autorizada e aplicada sem alterar o backend ou expectativas. O teste de reenvio e os cinco casos relacionados passaram. Ver resultado final em [VALIDACAO-FINAL-SEGURANCA-GIT.md](VALIDACAO-FINAL-SEGURANCA-GIT.md). O texto abaixo preserva a descoberta histórica.


## UI-PA-01 — reenvio de primeiro acesso abandona a etapa de código

Classificação: defeito real de integração da interface, reproduzido em Chromium/celular, sem enfraquecimento do backend ou acesso indevido demonstrado. Impacto funcional: o usuário pede um novo código, recebe o email fictício e perde a tela para inseri-lo. Não é indisponibilidade do SMTP nem efeito do rate limit.

Teste preservado: `frontend/tests/recuperacao-visual.spec.ts`, “Reenvio mantém formulário de código para concluir primeiro acesso com o código novo”. A fixture torna paciente próprio elegível, solicita pelo navegador, verifica o formulário, clica Reenviar, confirma HTTP 200 e duas mensagens no SMTP local e exige a permanência do formulário para concluir com o novo código. Obtido: o formulário de código desaparece e a página volta ao email.

Causa: `frontend/src/pages/PrimeiroAcesso.tsx`, função `reenviarCodigo`, testa `dados.apto !== true`. O serviço/controller retornam apenas uma mensagem genérica no envio, sem `apto`, para não enumerar contas. A primeira solicitação da mesma página já aceita o 200 genérico corretamente e avança. O reenvio usa um contrato antigo e interpreta a ausência de `apto` como inelegibilidade.

Proposta concreta: após `resposta.ok`, manter a etapa de código, limpar apenas código/senhas preenchidos e exibir a mesma mensagem genérica; não acrescentar `apto` à API. Para email inexistente/inelegível, a tela deve manter comportamento indistinguível e a conclusão continua sendo validada pelo backend. Preservar expiração, consumo atômico, tentativas, CSRF/CORS e rate limits. Não alterar a expectativa nem usar skip/fail esperado.

Patch revisável, **não aplicado**: [PROPOSTA-REENVIO-PRIMEIRO-ACESSO.patch](PROPOSTA-REENVIO-PRIMEIRO-ACESSO.patch). Ele mantém a mensagem genérica e não altera o backend.

Foi solicitada autorização específica para esse ajuste do fluxo de autenticação. Até resposta explícita, não aplicar a alteração; demais tarefas e validações prosseguem. Resultado final e eventual aprovação/correção serão registrados em `RELATORIO-CONSOLIDACAO-TCC.md`.

## Infraestrutura corrigida, sem defeito da aplicação

- A primeira fixture nova de casos clínicos compartilhava uma instância entre testes, atingindo o limite de cadastro. Instância por teste resolveu o isolamento, sem desativar limites. A bateria posterior passou nos 22 casos novos.
- As primeiras jornadas públicas abriram a origem 127.0.0.1, enquanto a origem permitida real é localhost. Corrigido o endereço público no teste, mantendo CORS/CSRF do backend.
- Um seletor de recuperação esperava “E-mail” em vez de “E-mail cadastrado”; o destino real do médico é `/medico/pacientes`. Os testes foram alinhados ao código/rotas existentes, preservando a exigência de autenticação real. Os três casos direcionados passaram.

## Achado separado de Git

`backend/cookies.txt` é rastreado e contém um JWT expirado. Não há reprodução do valor neste documento. Nenhuma credencial foi alterada ou removida; tratamento de rastreamento/histórico depende de revisão/autorização. Ver `AUDITORIA-ARQUIVOS-GIT.md`.


Consolidação final de 22/10/2026 às 19:33:45 UTC: UI-PA-01 foi a única reprovação entre 324 casos. Os 294 anteriores e outros 29 novos passaram. A UI teve 43/44, API 269/269 e backend 11/11, sem skip/flaky. O patch não foi aplicado porque a autorização específica ainda não chegou; não houve alteração de expectativa.
