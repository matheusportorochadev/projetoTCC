# Defeitos encontrados na expansão de cobertura — 22/10/2026

**Situação atualizada:** os seis defeitos deste registro histórico foram corrigidos após autorização. A consolidação seguinte teve 294 aprovados, zero falhas/ignorados, preservando os 288 anteriores e suas expectativas. Relatório: [CORRECAO-SEIS-DEFEITOS.md](CORRECAO-SEIS-DEFEITOS.md). As causas e reproduções abaixo são mantidas para rastreabilidade.


Nenhuma expectativa foi relaxada. Os casos abaixo permanecem na suíte, sem skip/fail esperado. As correções sensíveis não foram aplicadas nesta etapa. Todos os dados usados são fictícios e todas as escritas ficaram em `tcc_consultorio_testes`.

## SEG-02 — sessão principal sobrevive à redefinição da senha

Gravidade estimada: alta quando a redefinição é usada para recuperar uma conta comprometida. Não se demonstrou acesso a outro usuário; a falha é a permanência de uma sessão própria emitida anteriormente.

Reprodução: autenticar paciente fictício; solicitar recuperação em contexto independente; receber código no SMTP local; concluir a redefinição com sucesso; reapresentar a sessão anterior em `/perfil`. Esperado 401, obtido **200**. A senha antiga deixa de autenticar, mas o JWT antigo continua válido até expirar ou ser explicitamente revogado por logout.

Teste: `frontend/tests/api-recuperacao-senha.spec.ts`, `Redefinir senha invalida sessão principal emitida antes da alteração`.

Causa: `redefinicaoSenha.service.ts` atualiza bcrypt e flags, mas não persiste revogação de todas as sessões nem uma versão/data de alteração de credenciais. O middleware verifica assinatura, expiração, revogação individual, usuário ativo e perfil; não compara a sessão com a versão da senha. A revogação individual no logout continua funcionando e não foi removida.

Proposta a aprovar: definir redefinição como encerramento de todas as sessões anteriores, com versão persistida de autenticação por usuário ou registro equivalente. A versão deve mudar atomicamente com a senha e ser validada no middleware; documentar compatibilidade com JWTs antigos, recuperação clínica e sessões independentes. Pode exigir migração aditiva e atualização dos contratos ORM 8, além de aprovação da política. Não executar migração no principal nem invalidar indiscriminadamente sessões como solução temporária.

## HTTP-01 — JSON malformado retorna 500

Gravidade estimada: baixa, por semântica HTTP e confiabilidade operacional; não houve vazamento de dados na resposta observada.

Teste: `frontend/tests/api-seguranca-complementar.spec.ts`, `JSON malformado retorna erro de cliente, sem stack ou detalhes internos`.

Reprodução: `POST /auth/login` com Origin permitido, Content-Type JSON e documento incompleto fictício. Esperado **400**, obtido **500**. O parser rejeita antes da autenticação; não há escrita clínica.

Causa: o tratamento global em `backend/src/server.ts` trata CORS explicitamente e converte os demais erros em 500, incluindo `entity.parse.failed` do parser.

Proposta: mapear somente erros conhecidos do parser para 400, com mensagem pública genérica; manter erros internos em 500 e evitar registrar corpos sensíveis. Preservar CSRF/CORS, limite de corpo e autenticação. Não aplicada nesta expansão.

## HTTP-02 — corpo acima do limite retorna 500

Gravidade estimada: baixa, por resposta incorreta ao cliente e observabilidade.

Teste: `frontend/tests/api-seguranca-complementar.spec.ts`, `Corpo acima de 10kb retorna 413 e servidor continua disponível`.

Reprodução: JSON fictício maior que 10 KB em `/auth/login`. Esperado **413**, obtido **500**. O limite existe e rejeita o corpo; a falha é a classificação da resposta, não a ausência da proteção.

Causa e proposta: tratar `entity.too.large` de forma explícita no handler global, retornar 413 sem expor conteúdo, preservar rejeição e demais proteções. Não aumentar o limite para fazer o teste passar. Não aplicada nesta expansão.

## Infraestrutura corrigida nesta etapa

- SMTP externo substituído somente nos processos de teste por receptor local sem relay; teste específico simula indisponibilidade do envio.
- A chave JWT dos processos adversariais é efêmera, somente em memória; controles positivos asseguram que os testes negativos não passam por uma assinatura de teste inválida.
- Senha clínica fictícia precisa cumprir o schema; passou a ser derivada da credencial de teste com complexidade adicional, sem gravar senha em código/relatório.
- Datas da fixture de paginação ficam no meio do dia para evitar depender do limite UTC do fuso local.
- Seletores usam os rótulos acessíveis reais, inclusive asterisco de obrigatoriedade e ícone no botão móvel de saída. Tentativas interrompidas durante desenvolvimento não substituem a consolidação final.

Os erros de configuração inicial dos testes acima foram corrigidos nas fixtures/seletores, sem alterar os schemas ou a semântica da aplicação. Resultados consolidados e pendências estão em `MATRIZ-COBERTURA-PENDENTE.md` e `ACOMPANHAMENTO.md`.


## COD-01/02/03 — códigos aceitos duas vezes em conclusões simultâneas

Três regressões independentes, reproduzidas com um único par de requisições por fluxo, sem carga pesada:

| Código | Fluxo | Teste | Esperado | Obtido na bateria focada |
| --- | --- | --- | --- | --- |
| COD-01 | Primeiro acesso | `api-primeiro-acesso.spec.ts`: consumo único sob conclusões simultâneas | `[200, 400]` | `[200, 200]` |
| COD-02 | Redefinição principal | `api-recuperacao-senha.spec.ts`: consumo único sob conclusões simultâneas | `[200, 400]` | `[200, 200]` |
| COD-03 | Recuperação clínica | `api-recuperacao-clinica.spec.ts`: consumo único sob conclusões simultâneas | `[200, 400]` | `[200, 200]` |

Gravidade estimada: média, com potencial maior quando o código é interceptado e há disputa pela nova credencial. A pré-condição é conhecer um código válido. Não foi demonstrado acesso sem esse conhecimento nem acesso a dados reais.

Causa: as três rotinas consultam o código como disponível antes do bcrypt e só depois marcam seu uso. Não há reivindicação atômica condicionada a `usado=false` que impeça ambas de prosseguir. No fluxo clínico, a transação que atualiza senha/versão/código não resolve essa corrida porque a leitura/validação ocorreu antes e o update do código não exige que continue disponível.

A repetição sequencial já é rejeitada corretamente. Isso não garante consumo único sob concorrência, por isso os testes novos não duplicam os anteriores.

Proposta a aprovar: consumir/reivindicar o código e atualizar a credencial numa única transação, verificando atomicamente validade, uso e tentativas (lock de registro ou update condicional com resultado checado), mantendo rollback se a troca não puder ser persistida. Garantir apenas uma auditoria de sucesso, revogação correta e nenhuma possibilidade de reutilização após falha parcial. Respeitar a API de transações do ORM 8 existente. Aplicar a correção separadamente e não mascarar `[200, 200]` como sucesso idempotente de uma credencial de uso único.

Nenhuma correção de segurança foi aplicada por antecipação nesta expansão. Essas três falhas, SEG-02 e os dois erros HTTP continuam nas expectativas de teste e impedem aprovação integral do pipeline.


## Consolidação confirmada

Na execução final de 22/10/2026, os seis casos acima reprovaram novamente entre **288 casos executados**. Os demais **282 passaram**, incluindo todos os 178 anteriores. Não houve skip, teste marcado como falha esperada ou alteração de expectativa para obter aprovação. Lint, tipos, build, scripts avulsos e 36 casos de interface passaram. A suíte continua retornando erro enquanto essas regressões não forem corrigidas.
