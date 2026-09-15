# CODE TCC — Documentação Completa do Projeto

## Sistema de Controle e Informatização de Agenda Médica e Prontuários Eletrônicos

**Projeto:** CODE TCC  

**Tema:** Sistema para gerenciamento de consultório médico  

**Stack:** React + TypeScript, Node.js + Express, PostgreSQL e Prisma ORM  

**Objetivo:** informatizar cadastro de pacientes, controle de acesso, agenda médica, agendamentos e prontuários eletrônicos.

---

# 1. Visão geral

O projeto consiste em uma aplicação web para apoiar a rotina de um consultório médico. A proposta é centralizar em um único sistema o cadastro de médicos e pacientes, autenticação, definição de agenda, disponibilidades, agendamentos e, na etapa final, prontuários eletrônicos.

A arquitetura foi organizada em duas partes independentes:

```text

tcc-consultorio/

├── backend/

└── frontend/

```

O **frontend** é responsável pela interface que o usuário vê no navegador. O **backend** recebe requisições, valida permissões, executa regras de negócio e acessa o banco de dados.

Fluxo geral:

```text

Usuário

  ↓

Frontend React

  ↓ HTTP/JSON

Backend Express

  ↓

Controllers

  ↓

Services

  ↓

Prisma ORM

  ↓

PostgreSQL

```

---

# 2. Perfis de usuário

O sistema possui três perfis.

## 2.1 ADMIN

O administrador é responsável pela gestão geral do sistema.

Principais funções:

- fazer login na área administrativa;

- cadastrar médicos;

- visualizar médicos cadastrados;

- ativar ou bloquear médicos;

- excluir médicos quando permitido;

- administrar usuários.

## 2.2 MEDICO

O médico utiliza a área clínica do sistema.

Principais funções:

- fazer login;

- cadastrar pacientes;

- editar pacientes;

- ativar ou bloquear pacientes;

- liberar o acesso do paciente ao sistema;

- configurar sua agenda;

- definir datas e horários disponíveis;

- acompanhar consultas marcadas;

- futuramente registrar prontuários.

## 2.3 PACIENTE

O paciente possui acesso somente às próprias informações.

Fluxo esperado:

- é cadastrado pelo médico;

- recebe acesso quando o médico libera;

- faz login;

- visualiza seus dados;

- visualiza horários disponíveis;

- marca consultas;

- acompanha seus agendamentos;

- futuramente consulta informações autorizadas do histórico.

O paciente não pode visualizar a agenda completa do médico, nomes de outros pacientes ou prontuários de terceiros.

---

# 3. Tecnologias utilizadas

## Backend

- Node.js

- TypeScript

- Express

- PostgreSQL

- Prisma ORM

- bcrypt

- jsonwebtoken

- nodemailer

- cors

- dotenv

- tsx

## Frontend

- React

- TypeScript

- Vite

- React Router

- CSS

## Desenvolvimento

- Visual Studio Code

- Git

- GitHub

- Postgres.app no macOS

---

# 4. Backend

A estrutura do backend é organizada por responsabilidade.

```text

backend/

├── src/

│   ├── controllers/

│   ├── middlewares/

│   ├── prisma/

│   ├── routes/

│   ├── services/

│   └── server.ts

├── .env

├── .env.example

├── package.json

└── tsconfig.json

```

## 4.1 server.ts

O `server.ts` é o ponto de entrada da API.

Ele é responsável por:

- criar a aplicação Express;

- habilitar JSON;

- configurar CORS;

- registrar as rotas;

- iniciar o servidor.

Exemplo conceitual:

```ts

const app = express();

app.use(cors());

app.use(express.json());

app.use("/auth", authRoutes);

app.use("/medicos", medicoRoutes);

app.use("/pacientes", pacienteRoutes);

app.use("/agenda", agendaRoutes);

app.listen(3000);

```

---

# 5. Banco de dados e Prisma

O banco utilizado é PostgreSQL.

A conexão é definida por variável de ambiente:

```env

DATABASE_URL=postgresql://...

```

O projeto utiliza o fluxo novo do Prisma por contrato.

Arquivos principais:

```text

src/prisma/

├── contract.prisma

├── contract.json

├── contract.d.ts

└── db.ts

```

O `contract.prisma` descreve os modelos do banco. Após alterações, são usados:

```bash

npx prisma contract emit

npx prisma db update

npx prisma db verify

```

E para validar o TypeScript:

```bash

npm run typecheck

```

---

# 6. Modelos principais

## 6.1 Usuario

Representa qualquer pessoa que pode autenticar no sistema.

```prisma

model Usuario {

  id             Int

  nome           String

  email          String

  senha          String

  tipo           TipoUsuario

  ativo          Boolean

  primeiroAcesso Boolean

}

```

O tipo do usuário é definido por:

```prisma

enum TipoUsuario {

  ADMIN

  MEDICO

  PACIENTE

}

```

O campo `ativo` permite bloquear um usuário sem necessariamente apagar o registro. O campo `primeiroAcesso` serve para forçar a troca da senha inicial.

## 6.2 Medico

O médico possui dados próprios além do usuário.

```prisma

model Medico {

  id        Int

  usuarioId Int

  crm       String

}

```

Relação principal:

```text

Usuario 1 ↔ 1 Medico

```

O médico também possui pacientes e disponibilidades.

## 6.3 Paciente

O paciente é cadastrado pelo médico.

```prisma

model Paciente {

  id             Int

  medicoId       Int

  usuarioId      Int?

  nome           String

  email          String?

  telefone       String?

  cpf            String?

  acessoLiberado Boolean

  ativo          Boolean

}

```

A relação com `Usuario` é opcional porque o paciente pode existir no cadastro antes de ter acesso ao sistema.

Fluxo:

```text

Médico cadastra paciente

  ↓

Paciente existe no banco

  ↓

Ainda não possui acesso

  ↓

Médico libera acesso

  ↓

Paciente passa a poder autenticar

```

## 6.4 CodigoRedefinicaoSenha

Armazena códigos temporários usados para recuperação ou redefinição de senha.

Campos principais:

- usuário;

- código;

- expiração;

- indicador de uso;

- data de criação.

## 6.5 DisponibilidadeAgenda

A agenda começou baseada em dia da semana, mas foi alterada para trabalhar com datas específicas. Isso permite montar o mês inteiro.

Estrutura atual:

```prisma

model DisponibilidadeAgenda {

  id              Int

  medicoId        Int

  data            DateString

  horaInicio      String

  horaFim         String

  duracaoConsulta Int

  ativo           Boolean

}

```

Exemplo:

```text

Data: 2026-09-14

Início: 08:00

Fim: 12:00

Duração: 30 minutos

```

A data é armazenada no formato `YYYY-MM-DD` e os horários em `HH:mm`.

---

# 7. Autenticação

A autenticação utiliza JWT.

Fluxo:

```text

Usuário informa email e senha

  ↓

Backend procura usuário

  ↓

Verifica se está ativo

  ↓

bcrypt compara a senha

  ↓

Backend gera JWT

  ↓

Frontend salva o token

  ↓

Token é enviado nas próximas requisições

```

Cabeçalho:

```http

Authorization: Bearer TOKEN

```

---

# 8. Middleware de autenticação

O `authMiddleware` valida o token antes de permitir acesso às rotas protegidas.

Fluxo:

```text

Requisição

  ↓

Existe token?

  ↓

Token é válido?

  ↓

Usuário é identificado

  ↓

Requisição continua

```

Sem token válido, a requisição é bloqueada.

---

# 9. Controle de perfil

Além da autenticação, o sistema verifica o perfil.

Exemplo:

```ts

permitirPerfis("MEDICO")

```

Assim, um paciente autenticado não pode acessar rotas exclusivas do médico.

---

# 10. Login

Endpoint principal:

```text

POST /auth/login

```

O frontend envia email e senha. O backend valida e devolve token, dados do usuário, perfil e situação de primeiro acesso.

O frontend utiliza o perfil para encaminhar o usuário à área correta.

---

# 11. Primeiro acesso e redefinição de senha

Médicos cadastrados pelo administrador recebem senha provisória.

Fluxo:

```text

Login inicial

  ↓

primeiroAcesso = true

  ↓

Sistema envia código por email

  ↓

Usuário informa código

  ↓

Define nova senha

  ↓

primeiroAcesso = false

```

Rotas principais:

```text

POST /auth/esqueci-senha

POST /auth/redefinir-senha

```

O envio de email utiliza Nodemailer e SMTP.

---

# 12. Módulo de médicos

Principais rotas:

```text

POST   /medicos

GET    /medicos

GET    /medicos/:id

PATCH  /medicos/:id/status

DELETE /medicos/:id

```

O administrador informa nome, email, CRM e senha provisória.

O backend:

1. valida os dados;

2. normaliza o email;

3. normaliza o CRM;

4. valida a senha;

5. cria o usuário;

6. cria o médico;

7. relaciona os registros.

A senha é armazenada com hash bcrypt.

---

# 13. Módulo de pacientes

Rotas implementadas:

```text

POST   /pacientes

GET    /pacientes

GET    /pacientes/:id

PATCH  /pacientes/:id

PATCH  /pacientes/:id/status

PATCH  /pacientes/:id/acesso

```

O `medicoId` não é confiado ao frontend. O backend identifica o médico pelo JWT.

Isso evita que um médico tente manipular pacientes pertencentes a outro médico.

---

# 14. Cadastro de pacientes

Fluxo:

```text

Médico preenche formulário

  ↓

Frontend envia dados

  ↓

Backend identifica médico pelo token

  ↓

Valida os campos

  ↓

Cria paciente

  ↓

Retorna resposta ao frontend

```

O frontend também possui formatação de CPF e telefone.

---

# 15. Liberação de acesso do paciente

`ativo` e `acessoLiberado` têm funções diferentes.

- `ativo`: controla se o cadastro está habilitado;

- `acessoLiberado`: indica se aquele paciente pode usar o sistema.

Isso é importante porque o médico pode cadastrar um paciente sem imediatamente permitir login.

---

# 16. Agenda médica

A agenda permite ao médico configurar datas do mês em que realizará atendimentos.

Ele pode definir:

- mês;

- uma ou várias datas;

- horário inicial;

- horário final;

- duração de cada consulta.

Exemplo:

```text

Datas: 14, 15, 16, 21, 22 e 23 de setembro

Horário: 08:00 até 12:00

Duração: 30 minutos

```

---

# 17. Rotas da agenda

```text

GET    /agenda/disponibilidades

POST   /agenda/disponibilidades

PUT    /agenda/disponibilidades/:id

DELETE /agenda/disponibilidades/:id

```

Todas exigem autenticação e perfil `MEDICO`.

---

# 18. agenda.service.ts

O service concentra o acesso ao banco.

Funções principais:

```text

buscarMedicoAgendaPorUsuarioId

listarDisponibilidadesAgenda

buscarDisponibilidadesPorData

buscarDisponibilidadeAgendaPorId

criarDisponibilidadeAgenda

atualizarDisponibilidadeAgenda

removerDisponibilidadeAgenda

```

---

# 19. Identificação do médico na agenda

O backend recebe `usuarioId` do JWT e procura o médico correspondente.

```text

JWT

 ↓

usuarioId

 ↓

Medico.where({ usuarioId })

 ↓

medico.id

```

Esse `medico.id` é usado nas consultas e alterações da agenda.

---

# 20. Cadastro em múltiplas datas

O frontend pode enviar várias datas em uma única requisição.

Exemplo:

```json

{

  "datas": [

    "2026-09-14",

    "2026-09-15",

    "2026-09-16"

  ],

  "horaInicio": "08:00",

  "horaFim": "12:00",

  "duracaoConsulta": 30

}

```

O controller percorre cada data, valida e cria a disponibilidade correspondente.

---

# 21. Verificação de conflitos

O sistema impede períodos sobrepostos.

Se já existe:

```text

08:00 → 12:00

```

não deve ser aceito:

```text

10:00 → 13:00

```

A regra utilizada é equivalente a:

```ts

novoInicio < fimExistente &&

novoFim > inicioExistente

```

---

# 22. Exclusão lógica

Ao remover uma disponibilidade, o registro é marcado como inativo:

```text

ativo = false

```

Isso preserva o histórico e evita apagar dados desnecessariamente.

---

# 23. Frontend

O frontend foi desenvolvido com React, TypeScript e Vite.

Estrutura conceitual:

```text

frontend/

├── src/

│   ├── components/

│   ├── pages/

│   │   ├── admin/

│   │   └── medico/

│   ├── styles/

│   ├── App.tsx

│   └── main.tsx

```

---

# 24. Rotas do frontend

Exemplos:

```text

/login

/admin

/medico/pacientes

/medico/agenda

/medico/prontuarios

```

A área médica utiliza `MedicoLayout.tsx` com `NavLink`, `Outlet` e `useNavigate`.

---

# 25. Página de pacientes

Na interface do médico, o módulo de pacientes permite:

- listar;

- cadastrar;

- editar;

- bloquear;

- ativar;

- liberar acesso.

A interface consome diretamente as rotas da API e exibe mensagens de sucesso ou erro.

---

# 26. Página Agenda.tsx

A agenda possui duas abas:

```text

Disponibilidade

Horários marcados

```

## Disponibilidade

Mostra o calendário mensal e o formulário de configuração.

## Horários marcados

É a área reservada para as consultas efetivamente agendadas pelos pacientes. Atualmente é uma estrutura visual e será conectada ao modelo de agendamento em etapa posterior.

---

# 27. Calendário mensal

O calendário é calculado com base em `mesAtual` e `anoAtual`.

O frontend determina:

- primeiro dia do mês;

- último dia do mês;

- quantidade de dias;

- posição do primeiro dia na semana.

Exemplo:

```ts

new Date(anoAtual, mesAtual, 1)

new Date(anoAtual, mesAtual + 1, 0)

```

Depois os dias são montados em um grid de sete colunas.

---

# 28. Seleção de datas

O estado `datasSelecionadas` guarda as datas escolhidas.

Exemplo:

```ts

[

  "2026-09-14",

  "2026-09-15",

  "2026-09-21"

]

```

O botão `+` dentro de cada dia seleciona ou remove aquela data da seleção.

O médico pode selecionar várias datas e aplicar o mesmo período de atendimento a todas.

---

# 29. Clique em um dia do calendário

O clique principal sobre o dia abre um modal.

O modal mostra os períodos disponíveis naquela data.

Exemplo:

```text

14/09/2026

Disponível

08:00 — 12:00

Consultas de 30 minutos

Disponível

14:00 — 18:00

Consultas de 30 minutos

```

O modal filtra os registros com:

```ts

disponibilidades.filter(

item => item.data === data

)

```

---

# 30. Remoção de períodos

Cada período disponível no modal possui um botão `Remover`.

Fluxo:

```text

Usuário clica em Remover

  ↓

Modal de confirmação abre

  ↓

Usuário confirma

  ↓

DELETE é enviado ao backend

  ↓

Backend define ativo = false

  ↓

Frontend recarrega a agenda

```

---

# 31. Modal de confirmação

Foi criado um modal próprio em vez de usar apenas `window.confirm`.

Ele exibe:

- data;

- horário;

- duração;

- botão cancelar;

- botão confirmar;

- estado de carregamento.

Isso melhora a experiência visual e reduz exclusões acidentais.

---

# 32. Tema claro e escuro

O sistema possui tema claro e escuro.

O botão de tema altera a classe:

```text

body.modo-escuro

```

O CSS utiliza seletores específicos, por exemplo:

```css

body*.modo-escuro* **.agenda-modal** {

  background: #111827;

}

```

A preferência pode ser mantida em `localStorage`.

---

# 33. localStorage

O frontend utiliza `localStorage` para informações como token e tema.

Exemplo:

```ts

localStorage.getItem("token");

```

O token é enviado em cada requisição protegida.

---

# 34. Comunicação frontend e backend

Exemplo de leitura:

```ts

fetch(

  "http://localhost:3000/agenda/disponibilidades",

  {

    headers: {

      Authorization: `Bearer ${token}`

    }

  }

);

```

Exemplo de criação:

```ts

fetch(

  "http://localhost:3000/agenda/disponibilidades",

  {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      Authorization: `Bearer ${token}`

    },

    body: JSON.stringify(dados)

  }

);

```

---

# 35. Separação Route, Middleware, Controller e Service

A arquitetura segue este fluxo:

```text

Route

  ↓

Middleware

  ↓

Controller

  ↓

Service

  ↓

Prisma

  ↓

PostgreSQL

```

## Route

Define o endereço da API e quais funções devem ser executadas.

## Middleware

Valida autenticação e autorização.

## Controller

Lê parâmetros, valida entrada, define status HTTP e devolve JSON.

## Service

Executa acesso ao banco e regras relacionadas aos dados.

Essa separação facilita manutenção e testes.

---

# 36. Variáveis de ambiente

Segredos ficam no `.env`.

Exemplos:

```text

DATABASE_URL

JWT_SECRET

SMTP_HOST

SMTP_PORT

SMTP_USER

SMTP_PASS

ADMIN_EMAIL

ADMIN_SENHA

```

O `.env` não deve ser versionado no GitHub.

O `.env.example` deve conter apenas nomes de variáveis e valores de exemplo.

---

# 37. Segurança

A aplicação já utiliza várias medidas importantes:

- hash de senha com bcrypt;

- JWT para autenticação;

- middleware de perfil;

- identificação do médico pelo token;

- variáveis sensíveis no `.env`;

- acesso isolado por usuário;

- exclusão lógica em partes do sistema.

O projeto também deve considerar LGPD, pois dados médicos são dados pessoais sensíveis.

---

# 38. Fluxo completo do administrador

```text

Admin faz login

  ↓

Acessa área administrativa

  ↓

Cadastra médico

  ↓

Sistema cria Usuario

  ↓

Sistema cria Medico

  ↓

Médico recebe senha provisória

  ↓

Médico faz primeiro acesso

  ↓

Redefine senha

```

---

# 39. Fluxo completo do médico

```text

Médico faz login

  ↓

Acessa área médica

  ↓

Cadastra pacientes

  ↓

Libera acesso quando necessário

  ↓

Configura agenda mensal

  ↓

Define datas e períodos

  ↓

Paciente poderá visualizar slots

  ↓

Consultas serão agendadas

  ↓

Médico verá horários marcados

  ↓

Realiza consulta

  ↓

Registra prontuário

```

---

# 40. Fluxo previsto do paciente

```text

Médico cadastra paciente

  ↓

Libera acesso

  ↓

Paciente autentica

  ↓

Visualiza horários disponíveis

  ↓

Escolhe data

  ↓

Escolhe horário

  ↓

Cria agendamento

  ↓

Consulta aparece para o médico

```

---

# 41. Próximo módulo: Agendamento

O próximo módulo importante deve representar consultas efetivamente reservadas.

Uma proposta é:

```prisma

enum StatusAgendamento {

  AGENDADA

  CONFIRMADA

  REALIZADA

  CANCELADA

  FALTOU

}

```

E um modelo semelhante a:

```prisma

model Agendamento {

  id         Int

  medicoId   Int

  pacienteId Int

  data       DateString

  horaInicio String

  horaFim    String

  status     StatusAgendamento

}

```

Esse modelo relacionará médico, paciente, data, horário e status.

---

# 42. Geração de slots

Uma disponibilidade de:

```text

08:00 → 12:00

Duração: 30 minutos

```

gera os slots:

```text

08:00

08:30

09:00

09:30

10:00

10:30

11:00

11:30

```

Quando um slot for reservado, ele não deverá mais aparecer como livre para outros pacientes.

---

# 43. Regras futuras de agendamento

O backend deverá validar:

- paciente autenticado;

- paciente ativo;

- acesso liberado;

- data realmente disponível;

- horário dentro do período configurado;

- slot ainda livre;

- ausência de conflito;

- cancelamentos conforme regras do consultório.

A validação final sempre deve ocorrer no backend, mesmo que o frontend também faça validações visuais.

---

# 44. Prontuário eletrônico

O prontuário será uma das últimas etapas do projeto.

O médico poderá registrar dados clínicos, por exemplo:

- observações;

- sintomas;

- diagnóstico;

- conduta;

- prescrição;

- retorno;

- anotações da consulta.

O paciente não poderá editar seu prontuário.

Uma relação futura pode seguir:

```text

Paciente

  ↓

Agendamento

  ↓

Consulta

  ↓

Prontuário

```

---

# 45. Estado atual do projeto

## Implementado

- estrutura backend;

- estrutura frontend;

- PostgreSQL;

- integração com Prisma;

- usuários;

- perfis;

- autenticação JWT;

- senhas com hash;

- recuperação de senha por email;

- primeiro acesso;

- cadastro e gestão de médicos;

- cadastro e gestão de pacientes;

- liberação de acesso;

- layout do médico;

- agenda mensal;

- seleção de múltiplas datas;

- cadastro de disponibilidade;

- prevenção de conflito;

- exclusão lógica;

- modal por dia;

- modal de exclusão;

- tema claro e escuro.

## Em desenvolvimento ou planejado

- modelo de agendamento;

- agendamento pelo paciente;

- aba real de horários marcados;

- conclusão do acesso do paciente;

- regras de cancelamento;

- bloqueios especiais na agenda;

- prontuário eletrônico;

- histórico médico;

- testes finais;

- reforços de segurança.

---

# 46. Exemplo completo da agenda

O médico abre setembro de 2026 e seleciona:

```text

14

15

16

21

22

23

```

Depois informa:

```text

Início: 08:00

Fim: 12:00

Duração: 30 minutos

```

O frontend envia:

```json

{

  "datas": [

    "2026-09-14",

    "2026-09-15",

    "2026-09-16",

    "2026-09-21",

    "2026-09-22",

    "2026-09-23"

  ],

  "horaInicio": "08:00",

  "horaFim": "12:00",

  "duracaoConsulta": 30

}

```

O backend:

1. autentica o médico;

2. identifica `medicoId`;

3. valida horários;

4. percorre as datas;

5. verifica conflito;

6. cria os registros;

7. responde ao frontend.

O calendário passa a marcar esses dias como disponíveis.

Ao clicar no dia 14, o modal mostra:

```text

14/09/2026

08:00 — 12:00

Consultas de 30 minutos

```

---

# 47. Scripts principais

## Backend

```bash

npm run dev

npm run typecheck

```

Após alteração no contrato do Prisma:

```bash

npx prisma contract emit

npx prisma db update

npx prisma db verify

```

## Frontend

```bash

npm run dev

```

Normalmente:

```text

Frontend: http://localhost:5173

Backend:  http://localhost:3000

```

---

# 48. Git e GitHub

O projeto utiliza Git para versionamento.

Branch de desenvolvimento:

```text

desenvolvimento

```

Fluxo recomendado:

```bash

git status

git add .

git commit -m "Descrição da alteração"

git push

```

Exemplos de commits:

```text

feat: adiciona agenda mensal

feat: adiciona cadastro de pacientes

fix: corrige conflito de disponibilidade

style: melhora modal da agenda

```

---

# 49. Conceitos demonstrados no projeto

O projeto reúne conhecimentos importantes do curso de Sistemas de Informação:

- arquitetura cliente-servidor;

- API REST;

- autenticação;

- autorização;

- banco de dados relacional;

- ORM;

- relacionamento entre entidades;

- React;

- gerenciamento de estado;

- requisições assíncronas;

- validação;

- segurança;

- UX;

- responsividade;

- controle de versão;

- separação de responsabilidades.

---

# 50. Autenticação x autorização

Autenticação responde:

> Quem é o usuário?

Exemplo:

```text

email + senha + JWT

```

Autorização responde:

> O que esse usuário pode fazer?

Exemplo:

```text

ADMIN cadastra médico.

MEDICO cadastra paciente.

PACIENTE não acessa área administrativa.

```

---

# 51. Por que o backend não deve confiar no frontend

O frontend roda no navegador e pode ser manipulado pelo usuário.

Por isso, dados sensíveis como `medicoId` não devem ser aceitos cegamente.

O backend usa o token para descobrir qual médico está autenticado.

Essa decisão impede acessos indevidos a registros de outros usuários.

---

# 52. Tratamento de erros

A API devolve mensagens JSON.

Exemplo:

```json

{

  "mensagem": "Já existe um horário conflitante nesta data."

}

```

O frontend interpreta a resposta e apresenta um alerta visual.

Códigos HTTP relevantes:

```text

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

500 Internal Server Error

```

---

# 53. Responsividade

O CSS utiliza media queries para adaptar as páginas a telas menores.

Exemplo:

```css

@media (max-width: 600px) {

  ...

}

```

O objetivo é permitir uso em desktop, notebook, tablet e celular.

---

# 54. Melhorias futuras de segurança

Antes da versão final, são recomendáveis:

- hash dos códigos de redefinição de senha;

- limite de tentativas de login;

- limite de solicitações de código;

- respostas genéricas na recuperação de senha;

- expiração rigorosa de tokens;

- logs de ações importantes;

- validação completa de CPF;

- política de senha;

- confirmação de email;

- proteção contra abuso de endpoints.

---

# 55. Melhorias futuras da agenda

A agenda poderá receber:

- bloqueio de dia inteiro;

- férias;

- feriados;

- intervalos;

- horários especiais;

- encaixes;

- duração diferente por data;

- repetição semanal;

- visualização diária;

- visualização semanal;

- filtros de consultas;

- cores por status.

---

# 56. LGPD e privacidade

Como o sistema trabalha com informações médicas, é importante observar princípios da LGPD.

Entre eles:

- acesso mínimo necessário;

- proteção de dados pessoais;

- controle por perfil;

- armazenamento seguro;

- não exposição de dados de terceiros;

- rastreabilidade de ações sensíveis.

Um paciente deve visualizar somente seus próprios dados.

---

# 57. Resumo da arquitetura

## Frontend

```text

React

TypeScript

Vite

React Router

CSS

```

Responsável por:

```text

interface

navegação

formulários

modais

calendário

requisições

feedback visual

```

## Backend

```text

Node.js

Express

TypeScript

JWT

bcrypt

Nodemailer

Prisma

```

Responsável por:

```text

autenticação

autorização

validação

regras de negócio

segurança

API

acesso ao banco

```

## Banco

```text

PostgreSQL

```

Responsável por armazenar:

```text

usuários

médicos

pacientes

disponibilidades

códigos de redefinição

futuramente agendamentos

futuramente prontuários

```

---

# 58. Fluxo técnico completo

```text

┌───────────────────────────────────────┐

│               USUÁRIO                 │

└───────────────────┬───────────────────┘

                    │

                    ▼

┌───────────────────────────────────────┐

│            FRONTEND REACT             │

│ Login                                 │

│ Admin                                 │

│ Pacientes                             │

│ Agenda                                │

│ Prontuários                           │

└───────────────────┬───────────────────┘

                    │ HTTP + JSON

                    ▼

┌───────────────────────────────────────┐

│            BACKEND EXPRESS            │

│ Routes                                │

│   ↓                                   │

│ Middlewares                           │

│   ↓                                   │

│ Controllers                           │

│   ↓                                   │

│ Services                              │

└───────────────────┬───────────────────┘

                    │

                    ▼

┌───────────────────────────────────────┐

│              PRISMA ORM               │

└───────────────────┬───────────────────┘

                    │

                    ▼

┌───────────────────────────────────────┐

│              POSTGRESQL               │

│ Usuario                               │

│ Medico                                │

│ Paciente                              │

│ DisponibilidadeAgenda                 │

│ CodigoRedefinicaoSenha                │

│ Agendamento (futuro)                  │

│ Prontuario (futuro)                   │

└───────────────────────────────────────┘

```

---

# 59. Conclusão

O CODE TCC foi organizado para evoluir de forma modular. O backend concentra segurança, autenticação, autorização, validações e acesso aos dados. O frontend oferece uma interface moderna para cada perfil. O PostgreSQL centraliza os registros e o Prisma cria uma camada organizada entre aplicação e banco.

A agenda mensal permite ao médico selecionar datas específicas, definir períodos de atendimento e consultar rapidamente o que está disponível em cada dia por meio de um modal.

A próxima grande etapa é transformar essas disponibilidades em slots reserváveis pelos pacientes e criar o modelo de `Agendamento`. Depois disso, a aplicação poderá avançar para consultas e prontuários eletrônicos.

O fluxo final esperado do sistema é:

```text

Cadastro

  ↓

Acesso

  ↓

Agenda

  ↓

Agendamento

  ↓

Consulta

  ↓

Prontuário

  ↓

Histórico

```

Essa estrutura atende bem ao objetivo acadêmico do TCC e fornece uma base sólida para futuras melhorias e expansão do sistema.

---

# 60. Atualização do desenvolvimento — 11/09/2026

Esta seção registra as funcionalidades implementadas após a versão anterior desta documentação. O foco desta etapa foi concluir a base da agenda médica, criar o modelo de agendamento, consolidar a gestão de pacientes e iniciar a área autenticada do paciente.

## 60.1 Evolução do módulo de pacientes

O módulo de pacientes passou a contemplar o fluxo completo de cadastro e administração pelo médico.

Atualmente, o médico pode:

- cadastrar um novo paciente;

- listar os pacientes vinculados ao seu cadastro;

- pesquisar pacientes;

- visualizar os dados de um paciente;

- editar informações cadastrais;

- ativar ou bloquear o cadastro;

- liberar ou bloquear o acesso ao sistema;

- excluir fisicamente um paciente quando não existe histórico de agendamentos relacionado a ele.

A identificação do médico continua sendo feita pelo usuário autenticado no JWT. Portanto, o frontend não escolhe livremente o `medicoId` que será utilizado nas operações.

### Exclusão de paciente

Foi adicionada a rota:

```text

DELETE /pacientes/:id

```

A exclusão possui uma proteção importante: se o paciente já possuir registros de agendamento, sua exclusão física é recusada para evitar perda de histórico e quebra de integridade dos dados.

Quando a exclusão é permitida e existe um usuário associado ao paciente, o backend também remove os códigos de redefinição relacionados e o usuário vinculado.

O fluxo é:

```text

Médico solicita exclusão

        ↓

Backend identifica o médico pelo JWT

        ↓

Confirma que o paciente pertence ao médico

        ↓

Verifica se existem agendamentos

        ↓

┌──────────────────────────────┐

│ Existem agendamentos?        │

└──────────────┬───────────────┘

        Sim    │    Não

         ↓     │     ↓

   Bloqueia    │  Exclui Paciente

   exclusão    │     ↓

               │  Exclui códigos de senha

               │     ↓

               └→ Exclui Usuario vinculado

```

## 60.2 Liberação de acesso do paciente

O paciente pode ser cadastrado sem possuir imediatamente uma conta de autenticação.

No cadastro inicial:

```text

Paciente

├── usuarioId = null

├── acessoLiberado = false

└── ativo = true

```

Quando o médico libera o acesso pela primeira vez, o backend cria um `Usuario` do tipo `PACIENTE`, relaciona esse usuário ao cadastro do paciente e marca o acesso como liberado.

A senha inicial definida para o fluxo atual do projeto é:

```text

Paciente@

```

Ela é armazenada no banco somente após aplicação de hash com bcrypt. O texto da senha não é armazenado diretamente.

O usuário criado recebe:

```text

tipo = PACIENTE

ativo = true

primeiroAcesso = true

```

Assim, a senha genérica serve apenas para iniciar o processo de primeiro acesso.

Se o paciente já possuir `usuarioId` e seu acesso for liberado novamente, o usuário existente é reativado; uma nova conta não é criada.

## 60.3 Primeiro acesso do paciente

O fluxo de primeiro acesso foi ampliado para funcionar também com pacientes.

O paciente não precisa solicitar manualmente um link de criação de senha. O processo atual é:

```text

Médico cadastra paciente

        ↓

Médico libera acesso

        ↓

Backend cria Usuario PACIENTE

        ↓

Paciente acessa a tela de login

        ↓

Informa email cadastrado + Paciente@

        ↓

Backend valida as credenciais

        ↓

primeiroAcesso = true

        ↓

Backend gera código de 6 dígitos

        ↓

Código é enviado ao email cadastrado

        ↓

Frontend redireciona para /redefinir-senha

        ↓

Paciente informa código + nova senha

        ↓

Backend valida código e expiração

        ↓

Nova senha recebe hash bcrypt

        ↓

primeiroAcesso = false

        ↓

Próximo login entra normalmente na área do paciente

```

Essa implementação reaproveita a estrutura de `CodigoRedefinicaoSenha` e o serviço de envio de email já utilizado pelo sistema.

### Alteração no login

O serviço de autenticação passou a verificar `primeiroAcesso` depois da validação de email e senha. Quando o valor é `true`, o próprio backend dispara a geração e o envio do código de redefinição.

Isso evita que o frontend precise solicitar o código antes de saber se as credenciais são válidas.

No frontend, após um login válido:

```text

primeiroAcesso = true

        ↓

email salvo temporariamente em sessionStorage

        ↓

/redefinir-senha

```

Após a redefinição bem-sucedida, o email temporário é removido e o usuário volta para `/login` para entrar com sua nova senha.

## 60.4 Redirecionamento por perfil

Depois que o primeiro acesso foi concluído, o login encaminha cada usuário para sua própria área:

```text

ADMIN    → /admin

MEDICO   → /medico

PACIENTE → /paciente

```

O redirecionamento de primeiro acesso acontece antes do redirecionamento normal por perfil.

Portanto:

```text

Login válido

    ↓

primeiroAcesso?

    ├── Sim → /redefinir-senha

    └── Não

          ↓

       verifica perfil

          ├── ADMIN → /admin

          ├── MEDICO → /medico

          └── PACIENTE → /paciente

```

---

# 61. Modelo de Agendamento implementado

O módulo que anteriormente estava apenas planejado passou a possuir estrutura no banco e backend.

## 61.1 Status do agendamento

Foi criado o enum:

```prisma

enum StatusAgendamento {

  AGENDADA

  CONFIRMADA

  REALIZADA

  CANCELADA

  FALTOU

}

```

Esses estados permitirão representar todo o ciclo de uma consulta.

## 61.2 Modelo Agendamento

A estrutura atual é:

```prisma

model Agendamento {

  id         Int               @id @default(autoincrement())

  medicoId   Int

  pacienteId Int

  data       DateString

  horaInicio String

  horaFim    String

  status     StatusAgendamento @default(AGENDADA)

  createdAt  TimestamptzString @default(now())

  updatedAt  temporal.updatedAtString()

  medico   Medico   @relation(fields: [medicoId], references: [id])

  paciente Paciente @relation(fields: [pacienteId], references: [id])

  @@index([medicoId, data])

  @@index([pacienteId, data])

  @@index([medicoId, data, horaInicio])

}

```

Com isso, a relação principal passa a ser:

```text

Medico 1 ───── N Agendamento N ───── 1 Paciente

```

Cada agendamento registra qual médico atenderá, qual paciente será atendido, data, horário inicial, horário final e status.

## 61.3 Relações adicionadas

O modelo `Medico` passa a possuir:

```prisma

agendamentos Agendamento[]

```

E `Paciente`:

```prisma

agendamentos Agendamento[]

```

Isso permite consultar os agendamentos tanto pela perspectiva do médico quanto pela perspectiva do paciente.

---

# 62. Backend de agendamentos

Foram adicionados arquivos específicos para o módulo:

```text

backend/src/controllers/agendamento.controller.ts

backend/src/routes/agendamento.routes.ts

backend/src/services/agendamento.service.ts

```

A arquitetura continua seguindo:

```text

Route

  ↓

Middleware

  ↓

Controller

  ↓

Service

  ↓

Prisma Contract ORM

  ↓

PostgreSQL

```

## 62.1 Rotas de agendamento

A estrutura implementada possui as seguintes operações:

```text

GET  /agendamentos/horarios-disponiveis?data=YYYY-MM-DD

POST /agendamentos

GET  /agendamentos/meus

GET  /agendamentos/medico

```

### GET /agendamentos/horarios-disponiveis

Tem como objetivo retornar ao paciente apenas os horários que realmente podem ser reservados em uma determinada data.

### POST /agendamentos

Cria um novo agendamento depois que o backend valida o paciente, a disponibilidade e o horário solicitado.

### GET /agendamentos/meus

Permite que o paciente autenticado consulte os próprios agendamentos.

### GET /agendamentos/medico

Permite que o médico autenticado consulte os agendamentos relacionados à sua agenda.

## 62.2 Regra central de segurança do agendamento

Uma regra fundamental do sistema é:

> O paciente só pode agendar horários que foram previamente disponibilizados pelo médico.

O paciente não deve informar um horário arbitrário e fazer o backend aceitá-lo.

O fluxo correto é:

```text

Médico cria disponibilidade

        ↓

Backend armazena período

        ↓

Sistema gera slots possíveis

        ↓

Remove slots já ocupados

        ↓

Paciente recebe somente slots livres

        ↓

Paciente seleciona um deles

        ↓

Backend valida novamente

        ↓

Agendamento é criado

```

Mesmo que alguém altere manualmente uma requisição HTTP no navegador, a validação final continua sendo responsabilidade do backend.

## 62.3 Identificação automática do paciente e do médico

O frontend não precisa enviar livremente o `medicoId` do paciente.

Como `Paciente` possui relação com `Medico`:

```text

Usuario autenticado

        ↓

Paciente.usuarioId

        ↓

Paciente.medicoId

        ↓

Medico responsável

```

Assim, o backend consegue determinar qual agenda deve ser consultada a partir do usuário autenticado.

---

# 63. Geração dinâmica de horários disponíveis

O sistema utiliza as disponibilidades cadastradas pelo médico para gerar os horários individuais de consulta.

Exemplo de disponibilidade:

```text

Data: 15/09/2026

Período: 08:00 → 12:00

Duração: 30 minutos

```

Slots possíveis:

```text

08:00 → 08:30

08:30 → 09:00

09:00 → 09:30

09:30 → 10:00

10:00 → 10:30

10:30 → 11:00

11:00 → 11:30

11:30 → 12:00

```

Se `09:00 → 09:30` já estiver ocupado por um agendamento ativo, esse horário deve ser removido da lista apresentada aos demais pacientes.

Agendamentos com estados que representam reserva ativa, como `AGENDADA` e `CONFIRMADA`, são considerados na filtragem de horários ocupados.

---

# 64. Área do paciente no frontend

Foi iniciada uma interface exclusiva para o perfil `PACIENTE`.

A estrutura passou a incluir:

```text

frontend/src/layouts/PacienteLayout.tsx

frontend/src/pages/paciente/InicioPaciente.tsx

frontend/src/pages/paciente/AgendarConsulta.tsx

frontend/src/pages/paciente/MeusAgendamentos.tsx

frontend/src/styles/pacienteLayout.css

frontend/src/styles/inicioPaciente.css

```

## 64.1 Rotas do paciente

As rotas foram organizadas com layout aninhado no React Router:

```text

/paciente

/paciente/agendar

/paciente/agendamentos

```

Conceitualmente:

```tsx

<*Route* *path*="/paciente" *element*={<*PacienteLayout* />}>

  <*Route* *index* *element*={<*InicioPaciente* />} />

  <*Route* *path*="agendar" *element*={<*AgendarConsulta* />} />

  <*Route* *path*="agendamentos" *element*={<*MeusAgendamentos* />} />

\</*Route*>

```

O `PacienteLayout` utiliza `Outlet` para manter a barra de navegação enquanto o conteúdo interno muda.

## 64.2 Navbar do paciente

A área do paciente passou a seguir a mesma ideia visual da área médica, porém com opções específicas para esse perfil.

Menu atual:

```text

Sistema Médico

Início

Agendar consulta

Meus agendamentos

Tema claro/escuro

Dados do paciente

Sair

```

O paciente não recebe links administrativos nem opções exclusivas do médico.

## 64.3 Página inicial

`InicioPaciente.tsx` funciona como a página inicial da área autenticada do paciente e serve como ponto de entrada para as funcionalidades relacionadas às consultas.

## 64.4 Página Agendar consulta

`AgendarConsulta.tsx` foi criada como base para a interface que será conectada aos horários disponibilizados pelo médico.

A regra visual e funcional prevista é apresentar apenas horários livres retornados pelo backend.

## 64.5 Página Meus agendamentos

`MeusAgendamentos.tsx` foi criada como base para a visualização das consultas pertencentes ao paciente autenticado.

Essa página será ligada ao endpoint:

```text

GET /agendamentos/meus

```

---

# 65. Tema claro e escuro na área do paciente

A área do paciente passou a possuir suporte ao mesmo mecanismo de tema utilizado na área médica.

A preferência é armazenada em:

```text

localStorage

```

com a chave:

```text

tema

```

Valores utilizados:

```text

claro

escuro

```

Quando o tema escuro está ativo, o sistema aplica:

```text

body.modo-escuro

```

O layout do paciente altera a classe do `body`, permitindo que as páginas internas respondam ao tema por CSS.

A preferência permanece após recarregar a página.

---

# 66. Componente de tema

Foi criado o componente:

```text

frontend/src/components/BotaoTema.tsx

```

A criação de um componente específico ajuda a separar a responsabilidade de troca de tema da lógica das páginas e permite reaproveitar o comportamento entre diferentes áreas do sistema.

---

# 67. Atualização da agenda médica no frontend

A página `Agenda.tsx` recebeu evolução significativa.

O médico possui um calendário mensal no qual pode selecionar datas para cadastrar disponibilidades. O formulário de configuração permanece separado do calendário e o clique em uma data configurada permite visualizar os horários daquele dia em modal.

A antiga área redundante de "dias configurados" foi removida da experiência principal, concentrando a visualização diretamente no calendário e no modal de cada dia.

O modal foi estilizado para apresentar de maneira mais clara:

- data selecionada;

- períodos disponíveis;

- horário inicial e final;

- duração da consulta;

- ações relacionadas ao período.

O comportamento foi pensado para que o formulário permaneça em sua posição normal no layout, sem acompanhar indevidamente a rolagem da página.

---

# 68. Melhorias visuais no módulo de pacientes

Foram adicionados estilos específicos para a gestão de pacientes e para o formulário de novo paciente.

Arquivos envolvidos incluem:

```text

frontend/src/styles/pacientes.css

frontend/src/pages/medico/NovoPaciente.tsx

```

O formulário possui campos para:

```text

Nome

CPF

Telefone

Email

```

O frontend realiza formatação visual de CPF e telefone antes do envio.

Também foram trabalhados estados visuais de lista, pesquisa, ações, modal, formulários e compatibilidade com o tema escuro.

---

# 69. Estrutura atual do Prisma

Após as alterações, os principais modelos relacionados ao fluxo de consultas são:

```text

Usuario

  ↓

Medico / Paciente

  ↓

DisponibilidadeAgenda

  ↓

Agendamento

  ↓

Consulta (futuro)

  ↓

Prontuario (futuro)

```

O projeto utiliza o Prisma baseado em contrato. Após alterações no `contract.prisma`, o fluxo de atualização continua sendo:

```bash

npx prisma contract emit

npx prisma db update

npm run typecheck

```

Os arquivos gerados do contrato e snapshots de migração são mantidos junto ao projeto quando fazem parte do controle de versão necessário para reproduzir o estado do banco.

---

# 70. Arquivos principais adicionados nesta etapa

## Backend

```text

src/controllers/agenda.controller.ts

src/controllers/agendamento.controller.ts

src/controllers/paciente.controller.ts

src/routes/agenda.routes.ts

src/routes/agendamento.routes.ts

src/routes/paciente.routes.ts

src/services/agenda.service.ts

src/services/agendamento.service.ts

src/services/paciente.service.ts

```

Também foram atualizados:

```text

src/server.ts

src/services/auth.service.ts

src/prisma/contract.prisma

src/prisma/contract.json

src/prisma/contract.d.ts

migrations/

```

## Frontend

```text

src/components/BotaoTema.tsx

src/layouts/PacienteLayout.tsx

src/pages/medico/NovoPaciente.tsx

src/pages/paciente/InicioPaciente.tsx

src/pages/paciente/AgendarConsulta.tsx

src/pages/paciente/MeusAgendamentos.tsx

src/styles/agenda.css

src/styles/inicioPaciente.css

src/styles/pacienteLayout.css

src/styles/pacientes.css

src/styles/tema.css

```

Também foram atualizados:

```text

src/App.tsx

src/layouts/MedicoLayout.tsx

src/pages/Login.tsx

src/pages/RedefinirSenha.tsx

src/pages/medico/Agenda.tsx

src/pages/medico/Pacientes.tsx

src/styles/login.css

src/styles/medicoLayout.css

```

---

# 71. Scripts auxiliares locais e .gitignore

Durante o desenvolvimento foram utilizados scripts temporários para diagnóstico do banco e autenticação, como consultas e verificações de senha.

Esses scripts são ferramentas locais de desenvolvimento e foram adicionados ao `.gitignore` do backend para não serem enviados ao repositório principal.

Exemplos:

```text

consultar-db.ts

corrigir-senha-paciente.ts

excluir-paciente-teste.ts

testar-senha-paciente.ts

verificar-login-paciente.ts

```

O `.env` também permanece ignorado.

Estrutura relevante do `backend/.gitignore`:

```gitignore

node_modules/

dist/

.env

.env.*

!.env.example

consultar-db.ts

corrigir-senha-paciente.ts

excluir-paciente-teste.ts

testar-senha-paciente.ts

verificar-login-paciente.ts

```

Isso evita o versionamento de credenciais e arquivos auxiliares que não fazem parte da aplicação final.

---

# 72. Fluxo Git utilizado nesta atualização

A branch de trabalho continua sendo:

```text

desenvolvimento

```

Nesta atualização ocorreu uma situação importante: havia uma alteração feita diretamente no GitHub que ainda não existia no repositório local.

Por isso, o primeiro `git push` foi rejeitado com a indicação de que o remoto continha trabalho não disponível localmente.

Foi utilizado:

```bash

git pull --rebase origin desenvolvimento

```

O `rebase` trouxe o commit remoto e reaplicou o commit local depois dele, preservando uma história linear.

Depois disso:

```bash

git push origin desenvolvimento

```

foi concluído corretamente.

Fluxo recomendado para os próximos desenvolvimentos:

```bash

# Antes de começar, principalmente se houve edição pelo GitHub

git pull --rebase origin desenvolvimento

# Depois do desenvolvimento

git status

git add .

git status

git commit -m "feat: descrição objetiva da funcionalidade"

git push origin desenvolvimento

```

Nunca devem ser enviados arquivos `.env` ou credenciais ao repositório.

---

# 73. Estado atual atualizado do projeto

## Implementado

- estrutura de frontend e backend;

- PostgreSQL;

- Prisma Contract ORM;

- perfis `ADMIN`, `MEDICO` e `PACIENTE`;

- autenticação JWT;

- autorização por perfil;

- bcrypt para senhas;

- recuperação/redefinição por código enviado por email;

- primeiro acesso do médico;

- primeiro acesso do paciente;

- senha inicial de paciente com troca obrigatória;

- redirecionamento de login por perfil;

- cadastro e gestão de médicos;

- cadastro de pacientes;

- edição de pacientes;

- ativação e bloqueio de pacientes;

- liberação e bloqueio de acesso do paciente;

- exclusão protegida de pacientes;

- layout da área médica;

- layout inicial da área do paciente;

- navbar específica do paciente;

- tema claro e escuro;

- persistência do tema;

- agenda mensal do médico;

- seleção de múltiplas datas;

- disponibilidade por data específica;

- cadastro de períodos de atendimento;

- prevenção de conflitos de disponibilidade;

- exclusão lógica de disponibilidade;

- modal de horários por dia;

- modal de confirmação;

- enum `StatusAgendamento`;

- modelo `Agendamento`;

- relações de agendamento com médico e paciente;

- backend inicial de agendamentos;

- geração dinâmica de slots;

- filtragem de slots ocupados;

- endpoint de horários disponíveis;

- endpoint para criação de agendamento;

- endpoint de agendamentos do paciente;

- endpoint de agendamentos do médico;

- páginas iniciais de `Agendar consulta` e `Meus agendamentos`;

- organização do Git e proteção de arquivos locais/sensíveis no `.gitignore`.

## Em desenvolvimento

- conectar a página `AgendarConsulta.tsx` aos endpoints reais de horários disponíveis;

- permitir que o paciente escolha uma data e um slot livre;

- criar o agendamento pelo frontend;

- carregar os agendamentos reais em `MeusAgendamentos.tsx`;

- conectar a aba `Horários marcados` do médico aos agendamentos reais;

- implementar cancelamento de consulta;

- trabalhar visualmente os diferentes status de agendamento.

## Planejado para etapas posteriores

- fluxo de realização da consulta;

- prontuário eletrônico;

- histórico clínico;

- regras adicionais de cancelamento;

- bloqueios especiais, férias e intervalos de agenda;

- testes finais;

- reforços de segurança e privacidade.

---

# 74. Fluxo atual completo do paciente

O fluxo do paciente já pode ser representado da seguinte forma:

```text

┌──────────────────────────────┐

│ Médico cadastra o paciente   │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Médico libera o acesso       │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Backend cria Usuario         │

│ tipo = PACIENTE              │

│ senha inicial = Paciente@    │

│ primeiroAcesso = true        │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Paciente faz login           │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Código enviado por email     │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Paciente cria nova senha     │

│ primeiroAcesso = false       │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Login normal                 │

│ /paciente                    │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Área do paciente             │

│ - Início                     │

│ - Agendar consulta           │

│ - Meus agendamentos          │

│ - Tema claro/escuro          │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Consulta horários livres     │

│ do próprio médico            │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Seleciona slot disponível    │

│ (integração frontend em      │

│ desenvolvimento)             │

└──────────────┬───────────────┘

               ↓

┌──────────────────────────────┐

│ Agendamento                  │

└──────────────────────────────┘

```

---

# 75. Fluxo atual completo do médico

```text

Médico faz login

        ↓

Área médica

        ↓

┌────────────────────────────────────┐

│ Gestão de pacientes                │

│ - cadastrar                        │

│ - visualizar                       │

│ - editar                           │

│ - ativar/bloquear                  │

│ - liberar/bloquear acesso          │

│ - excluir quando permitido         │

└────────────────┬───────────────────┘

                 ↓

┌────────────────────────────────────┐

│ Agenda                             │

│ - navegar pelos meses              │

│ - selecionar datas                 │

│ - configurar período               │

│ - definir duração                  │

│ - impedir conflitos                │

│ - consultar períodos pelo modal    │

│ - remover disponibilidade          │

└────────────────┬───────────────────┘

                 ↓

┌────────────────────────────────────┐

│ Agendamentos                       │

│ backend criado                     │

│ integração da visualização médica  │

│ ainda em desenvolvimento           │

└────────────────┬───────────────────┘

                 ↓

Consulta

(futuro)

                 ↓

Prontuário

(futuro)

```

---

# 76. Fluxo técnico atualizado

```text

┌────────────────────────────────────────────┐

│                  USUÁRIO                   │

│       ADMIN | MEDICO | PACIENTE            │

└─────────────────────┬──────────────────────┘

                      │

                      ▼

┌────────────────────────────────────────────┐

│               FRONTEND REACT               │

│                                            │

│ Login / Redefinição de senha               │

│ Admin                                      │

│ Área médica                                │

│ Área do paciente                           │

│ Pacientes                                  │

│ Agenda                                     │

│ Agendamentos                               │

│ Tema claro/escuro                          │

└─────────────────────┬──────────────────────┘

                      │ HTTP + JSON + JWT

                      ▼

┌────────────────────────────────────────────┐

│              BACKEND EXPRESS               │

│                                            │

│ Routes                                     │

│    ↓                                       │

│ Middlewares                                │

│    ↓                                       │

│ Controllers                                │

│    ↓                                       │

│ Services                                   │

└─────────────────────┬──────────────────────┘

                      │

                      ▼

┌────────────────────────────────────────────┐

│           PRISMA CONTRACT ORM              │

└─────────────────────┬──────────────────────┘

                      │

                      ▼

┌────────────────────────────────────────────┐

│                POSTGRESQL                  │

│                                            │

│ Usuario                                    │

│ Medico                                     │

│ Paciente                                   │

│ CodigoRedefinicaoSenha                     │

│ DisponibilidadeAgenda                      │

│ Agendamento                                │

│ Prontuario (futuro)                        │

└────────────────────────────────────────────┘

```

---

# 77. Próxima etapa recomendada

A base necessária para o agendamento já está criada no banco e no backend. A próxima etapa lógica é concluir a integração do frontend do paciente.

Ordem recomendada:

```text

1. AgendarConsulta.tsx

        ↓

2. Escolha de data

        ↓

3. GET /agendamentos/horarios-disponiveis

        ↓

4. Mostrar somente slots livres

        ↓

5. Paciente seleciona um slot

        ↓

6. POST /agendamentos

        ↓

7. Atualizar horários disponíveis

        ↓

8. MeusAgendamentos.tsx

        ↓

9. GET /agendamentos/meus

        ↓

10. Horários marcados do médico

        ↓

11. GET /agendamentos/medico

        ↓

12. Cancelamento e demais status

```

Depois desse fluxo estar completo, o sistema terá uma ligação funcional entre:

```text

Disponibilidade do médico

        ↓

Slot disponível

        ↓

Escolha do paciente

        ↓

Agendamento

        ↓

Visualização pelo médico

```

Essa será a base para a próxima grande fase do TCC: **consulta e prontuário eletrônico**.

---

# 62. Atualização incremental do desenvolvimento — 14/09/2026

> **Importante:** esta seção foi adicionada de forma incremental. Todo o conteúdo anterior deste documento foi preservado integralmente. As seções abaixo registram somente as evoluções realizadas após a versão anterior e o próximo passo definido para o projeto.

## 62.1 Situação da documentação anterior

Na versão anterior, o projeto já documentava a arquitetura, autenticação, médicos, pacientes, agenda, criação do modelo de `Agendamento`, geração de slots e o início da integração da área do paciente.

Desde então, o fluxo de agendamento foi efetivamente conectado entre paciente e médico e a interface da agenda recebeu diversas mudanças.

O estado atual é:

```text
Médico cria disponibilidade
        ↓
Backend transforma disponibilidade em slots
        ↓
Paciente visualiza os slots livres
        ↓
Paciente seleciona data e horário
        ↓
Backend revalida o slot
        ↓
Agendamento é criado
        ↓
Paciente visualiza em "Meus agendamentos"
        ↓
Médico visualiza em "Horários marcados"
```

A próxima evolução, ainda não implementada no momento desta atualização, será transformar o agendamento direto em uma **solicitação pendente de aprovação do médico**.

---

# 63. Integração completa do agendamento do paciente

O módulo de agendamento passou a possuir integração real com o backend.

Endpoints atualmente utilizados:

```text
GET  /agendamentos/horarios-disponiveis
POST /agendamentos
GET  /agendamentos/meus
GET  /agendamentos/medico
```

As rotas continuam protegidas por JWT e perfil.

## 63.1 GET /agendamentos/horarios-disponiveis

Perfil:

```text
PACIENTE
```

Parâmetro:

```text
?data=YYYY-MM-DD
```

O backend não recebe um `medicoId` escolhido livremente pelo paciente.

O fluxo é:

```text
JWT do paciente
        ↓
req.usuario.id
        ↓
Paciente.usuarioId
        ↓
Paciente.medicoId
        ↓
Disponibilidades daquele médico
        ↓
Geração dos slots
        ↓
Remoção dos slots já ocupados
        ↓
Resposta ao frontend
```

Exemplo de resposta:

```json
{
  "data": "2026-09-18",
  "horarios": [
    {
      "horaInicio": "08:00",
      "horaFim": "08:30"
    },
    {
      "horaInicio": "08:30",
      "horaFim": "09:00"
    }
  ]
}
```

## 63.2 POST /agendamentos

Entrada atual:

```json
{
  "data": "2026-09-18",
  "horaInicio": "08:00"
}
```

O paciente não envia `horaFim` como fonte confiável.

O backend:

1. identifica o paciente pelo JWT;
2. verifica se ele está ativo;
3. verifica se possui acesso liberado;
4. identifica o médico responsável;
5. gera novamente os slots daquele dia;
6. verifica se o `horaInicio` ainda está disponível;
7. obtém o `horaFim` do slot válido;
8. cria o agendamento.

Essa revalidação é importante porque a tela do paciente pode estar aberta há alguns segundos ou minutos e outro usuário pode ocupar o horário nesse intervalo.

---

# 64. Tratamento de concorrência no agendamento

Foi mantida a regra de que o frontend nunca é a autoridade final sobre disponibilidade.

Exemplo:

```text
Paciente A abre 09:00 como disponível
        ↓
Paciente B agenda 09:00
        ↓
Paciente A ainda está com o modal antigo aberto
        ↓
Paciente A tenta confirmar
        ↓
Backend verifica novamente
        ↓
09:00 já está ocupado
        ↓
Backend responde conflito
```

O frontend trata o HTTP `409`.

Quando isso acontece:

1. o modal de confirmação é fechado;
2. o horário selecionado é limpo;
3. os horários do dia são carregados novamente;
4. a disponibilidade visual do mês é atualizada;
5. o modal de horários volta a ser exibido.

Assim o paciente pode escolher outro slot sem precisar reiniciar todo o processo.

---

# 65. Evolução de AgendarConsulta.tsx

Arquivo:

```text
frontend/src/pages/paciente/AgendarConsulta.tsx
```

A página passou a controlar o calendário, o modal de horários e o modal de confirmação.

Tipos relevantes:

```ts
type HorarioDisponivel = {
  horaInicio: string;
  horaFim: string;
};

type RespostaHorarios = {
  data: string;
  horarios: HorarioDisponivel[];
  mensagem?: string;
};

type QuantidadeHorariosPorDia = {
  [data: string]: number;
};

type AgendamentoRecente = {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
};
```

Estados importantes:

```text
mesAtual
anoAtual
dataSelecionada
horarios
quantidadePorDia
horarioSelecionado
agendamentosRecentes
modalHorariosAberto
modalConfirmacaoAberto
```

Além desses, existem estados de carregamento, erro e sucesso.

---

# 66. Construção local das datas

Foi adotada montagem manual de `YYYY-MM-DD` para evitar problemas de UTC.

Funções utilizadas conceitualmente:

```text
montarData(...)
obterDataHoje()
formatarData(...)
formatarDataExtenso(...)
dataJaPassou(...)
```

Isso evita que uma data local seja deslocada para o dia anterior por conversões automáticas para UTC.

---

# 67. Fluxo visual do paciente para selecionar um horário

Fluxo atual:

```text
Paciente abre "Agendar consulta"
        ↓
Calendário mensal é exibido
        ↓
Dias com horários disponíveis recebem destaque
        ↓
Paciente clica no dia
        ↓
Modal do dia abre
        ↓
Horários disponíveis são buscados
        ↓
Paciente escolhe um horário
        ↓
Modal de confirmação abre
        ↓
Paciente confirma
        ↓
POST /agendamentos
```

O POST não é realizado no primeiro clique no horário.

Isso evita agendamentos acidentais.

---

# 68. Comportamento ao cancelar o modal de confirmação

Se o paciente escolher não confirmar:

```text
Modal de confirmação fecha
        ↓
horarioSelecionado é limpo
        ↓
modal de horários do mesmo dia volta
```

O usuário pode então selecionar outro horário.

---

# 69. Agendamentos recentes na tela de agendamento

Após um POST bem-sucedido, o registro retornado pode ser incluído temporariamente em:

```text
agendamentosRecentes
```

Essa lista serve apenas para feedback imediato.

Ela não substitui o banco.

Ao atualizar ou navegar, a fonte permanente continua sendo:

```text
GET /agendamentos/meus
```

---

# 70. MeusAgendamentos.tsx conectado ao backend

Arquivo:

```text
frontend/src/pages/paciente/MeusAgendamentos.tsx
```

Endpoint:

```text
GET http://localhost:3000/agendamentos/meus
```

Cabeçalho:

```http
Authorization: Bearer TOKEN
```

O backend identifica o paciente autenticado e retorna somente os registros pertencentes a ele.

Isso impede que um paciente escolha outro `pacienteId` no frontend para consultar dados de terceiros.

---

# 71. Integração de "Horários marcados" do médico

A aba `Horários marcados` da agenda do médico deixou de ser somente uma estrutura visual.

Ela agora consulta:

```text
GET /agendamentos/medico
```

Perfil exigido:

```text
MEDICO
```

O backend identifica o médico pelo JWT e retorna seus agendamentos.

O frontend possui estados como:

```text
agendamentos
carregandoAgendamentos
erroAgendamentos
```

A função `carregarAgendamentos` é chamada quando a aba de horários marcados está ativa.

---

# 72. Nome e telefone do paciente em "Horários marcados"

Inicialmente o agendamento possuía apenas:

```text
pacienteId
```

Isso não era suficiente para uma interface útil ao médico.

O service foi atualizado para complementar o resultado com:

```text
pacienteNome
pacienteTelefone
```

Tipo utilizado:

```ts
export type AgendamentoMedicoRegistro =
  AgendamentoRegistro & {
    pacienteNome: string;
    pacienteTelefone: string | null;
  };
```

O backend busca os pacientes relacionados ao médico uma única vez e cria um `Map` por `id`.

Conceitualmente:

```ts
const pacientesPorId = new Map(
  pacientes.map((paciente) => [
    paciente.id,
    paciente
  ])
);
```

Depois cada agendamento recebe os dados correspondentes.

Essa solução evita executar uma nova consulta ao banco para cada agendamento individualmente.

---

# 73. Estrutura atual do agendamento no frontend médico

O tipo utilizado na agenda contém:

```ts
type Agendamento = {
  id: number;
  medicoId: number;
  pacienteId: number;
  pacienteNome: string;
  pacienteTelefone: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
};
```

Na interface são exibidos:

```text
Paciente
Telefone
Data
Horário
Status
```

Existem fallbacks para dados ausentes:

```text
Paciente não identificado
Não informado
```

---

# 74. useCallback e carregamento da agenda

Funções de carregamento foram organizadas com `useCallback`.

Isso permite que efeitos como:

```ts
useEffect(() => {
  if (abaAtiva === "marcados") {
    void carregarAgendamentos();
  }
}, [abaAtiva, carregarAgendamentos]);
```

tenham dependências mais estáveis e evita warnings desnecessários relacionados aos hooks.

---

# 75. Evolução da interface da agenda do médico

A agenda recebeu uma mudança importante de experiência.

A versão anterior utilizava um botão `+` dentro dos dias do calendário para selecionar várias datas.

Essa dinâmica foi removida.

O comportamento atual é:

```text
Médico clica diretamente no dia
        ↓
Modal daquele dia abre
```

O botão `+` não faz mais parte do fluxo atual.

---

# 76. Modal do dia da agenda médica

Ao clicar em um dia, o médico vê os períodos configurados naquela data.

O modal pode mostrar:

```text
Data
Período
Duração
Remover
Adicionar horário
```

Se não houver períodos, é exibido um estado vazio.

---

# 77. Segundo modal — adicionar horário

Foi criado um fluxo para cadastrar horário diretamente a partir do dia selecionado.

```text
Calendário
        ↓
Clique no dia
        ↓
Modal do dia
        ↓
Adicionar horário
        ↓
Modal de novo horário
        ↓
Hora inicial
Hora final
Duração
        ↓
Salvar
```

Estados adicionados:

```text
modalNovoHorarioAberto
dataNovoHorario
horaInicioModal
horaFimModal
duracaoConsultaModal
salvandoModal
erroModal
```

Após salvar:

1. o backend recebe a disponibilidade;
2. a agenda é recarregada;
3. o modal do dia volta a refletir o período recém-criado.

---

# 78. Configuração de horário no desktop

No desktop foi mantido o card:

```text
Configurar horário
```

Porém a seleção múltipla de datas foi removida desse fluxo.

O formulário passou a possuir:

```text
Data
Hora inicial
Hora final
Duração
```

Estado:

```text
dataConfiguracao
```

O endpoint existente continua recebendo `datas`, porém com uma única data:

```json
{
  "datas": ["2026-09-18"],
  "horaInicio": "08:00",
  "horaFim": "12:00",
  "duracaoConsulta": 30
}
```

Assim não foi necessário quebrar a API existente.

---

# 79. Configuração da agenda no celular

No celular o card lateral `Configurar horário` não é necessário.

Ele é escondido em telas de até 620px:

```css
@media (max-width: 620px) {
  .agenda-config-card {
    display: none;
  }
}
```

O médico configura a agenda pelo próprio calendário:

```text
Dia
 ↓
Modal
 ↓
Adicionar horário
```

Isso reduz o tamanho da página e deixa o fluxo mobile mais natural.

---

# 80. Calendário maior no celular

O desktop foi mantido com o tamanho considerado adequado.

Somente o mobile foi aumentado.

Até 620px:

```css
.agenda-dia,
.agenda-dia-vazio {
  min-height: 88px;
}
```

Até 430px:

```css
.agenda-dia,
.agenda-dia-vazio {
  min-height: 82px;
}
```

O objetivo é facilitar o toque nos dias sem alterar a aparência desktop.

---

# 81. Correção do destaque verde no tema claro

Foi identificado que o verde dos dias disponíveis estava muito fraco no modo claro.

O destaque foi reforçado:

```css
.agenda-dia-disponivel {
  border-color: #4ade80;
  background:
    linear-gradient(
      180deg,
      #dcfce7 0%,
      #f0fdf4 100%
    );
}
```

O número do dia disponível utiliza:

```css
.agenda-dia-disponivel .agenda-dia-numero {
  color: #166534;
}
```

No hover, o fundo e a borda ficam ainda mais evidentes.

---

# 82. Tema escuro da agenda

A agenda continua possuindo suporte completo a:

```text
body.modo-escuro
```

Os dias disponíveis no escuro usam verde translúcido sobre o fundo escuro.

O número do dia recebe verde claro para manter contraste.

---

# 83. Layout do paciente alinhado ao layout médico

Durante a evolução visual foi decidido manter o estilo que já estava funcionando bem na área do médico e fazer a área do paciente seguir o mesmo padrão.

Foram preservadas as classes específicas do paciente para não quebrar a estrutura do componente.

O paciente continua possuindo:

```text
Início
Agendar consulta
Meus agendamentos
Tema
Usuário
Sair
```

---

# 84. Navbar responsiva do paciente

Em telas menores, o menu horizontal é escondido.

A interface mostra:

```text
Sistema Médico
⋮
```

O botão abre um dropdown com:

- avatar;
- nome;
- perfil;
- Início;
- Agendar consulta;
- Meus agendamentos;
- tema;
- logout.

O menu fecha ao clicar fora.

---

# 85. Tema claro e escuro no layout do paciente

O paciente segue a mesma estratégia global:

```text
body.modo-escuro
```

A preferência continua persistida no navegador.

A adaptação visual foi feita sem alterar as regras de autenticação ou as rotas.

---

# 86. Diagnóstico de warnings e proteção contra regressões

Durante o desenvolvimento ocorreram situações em que linhas amarelas do VS Code foram confundidas com erros TypeScript.

Foi tentado:

```bash
npm run typecheck
```

no frontend, mas o script não existia.

Foi então executado:

```bash
npx tsc --noEmit
```

O comando terminou sem saída, indicando que naquele momento não existiam erros de compilação TypeScript.

Regra adotada daqui para frente:

```text
Warning amarelo
        ↓
ver tooltip ou Problems
        ↓
identificar mensagem exata
        ↓
só então alterar código
```

Não deve ser feita uma reescrita especulativa de um arquivo inteiro apenas para tentar remover um warning visual.

---

# 87. Problema de código corrompido por formatação

Em alguns envios grandes, conteúdo copiado chegou a possuir artefatos Markdown, por exemplo:

```text
*type*
**new**
\<
\|
```

Isso transformava TS/TSX válido em código inválido.

A partir disso, ficou definido que arquivos completos devem ser tratados com cuidado e, quando necessário, enviados como arquivo real ou bloco de código limpo.

---

# 88. Estado atual do StatusAgendamento

Antes da próxima alteração, os status utilizados são:

```text
AGENDADA
CONFIRMADA
REALIZADA
CANCELADA
FALTOU
```

Na criação atual:

```ts
status: "AGENDADA"
```

Na filtragem atual dos horários ocupados, são considerados principalmente:

```text
AGENDADA
CONFIRMADA
```

Esse é o estado do código antes da próxima etapa.

---

# 89. NOVA REGRA DE NEGÓCIO DEFINIDA — confirmação do médico

Foi definida uma nova dinâmica para as consultas.

O paciente não deverá mais transformar sua escolha diretamente em uma consulta definitivamente confirmada.

A ação do paciente passa a representar uma **solicitação de consulta**.

Novo fluxo:

```text
Paciente escolhe um horário
        ↓
Agendamento é criado como PENDENTE
        ↓
Horário fica reservado
        ↓
Médico analisa a solicitação
        ↓
Confirma ou recusa
```

---

# 90. Por que o status PENDENTE deve reservar o horário

Mesmo sem a aprovação final do médico, um pedido pendente precisa impedir outra solicitação para o mesmo slot.

Exemplo que deve ser evitado:

```text
Paciente A solicita 09:00
        ↓
PENDENTE
        ↓
09:00 continua aparecendo livre
        ↓
Paciente B solicita 09:00
```

Regra desejada:

```text
PENDENTE    = ocupa o slot
CONFIRMADA  = ocupa o slot
RECUSADA    = não ocupa
CANCELADA   = não ocupa
```

---

# 91. Novo enum planejado

O enum deverá mudar de:

```prisma
enum StatusAgendamento {
  AGENDADA
  CONFIRMADA
  REALIZADA
  CANCELADA
  FALTOU
}
```

para:

```prisma
enum StatusAgendamento {
  PENDENTE
  CONFIRMADA
  REALIZADA
  RECUSADA
  CANCELADA
  FALTOU
}
```

A remoção de `AGENDADA` precisa considerar registros já existentes no banco.

---

# 92. Novo status padrão

O model deverá passar de:

```prisma
status StatusAgendamento @default(AGENDADA)
```

para:

```prisma
status StatusAgendamento @default(PENDENTE)
```

E o service deverá passar de:

```ts
status: "AGENDADA"
```

para:

```ts
status: "PENDENTE"
```

---

# 93. Nova regra de ocupação no service

A busca de agendamentos que bloqueiam um slot passará de:

```text
AGENDADA
CONFIRMADA
```

para:

```text
PENDENTE
CONFIRMADA
```

Conceitualmente:

```ts
agendamento.status === "PENDENTE" ||
agendamento.status === "CONFIRMADA"
```

---

# 94. Como o paciente verá PENDENTE

Em `Meus agendamentos`, um pedido ainda não analisado deverá aparecer de forma clara.

Exemplo:

```text
15/09/2026
09:00 - 09:30

Aguardando confirmação do médico
```

Sugestão de cores:

```text
PENDENTE    → amarelo
CONFIRMADA  → verde
RECUSADA    → vermelho
CANCELADA   → cinza/vermelho
REALIZADA   → azul/verde
FALTOU      → laranja/cinza
```

A mensagem após o POST também deverá mudar.

Em vez de comunicar que a consulta está definitivamente agendada, deverá informar algo semelhante a:

```text
Solicitação enviada. Aguarde a confirmação do médico.
```

---

# 95. Como o médico verá PENDENTE

Na aba `Horários marcados`, o card pendente deverá apresentar ações.

Exemplo:

```text
Paciente: João da Silva
Telefone: (34) 99999-9999
Data: 15/09/2026
Horário: 09:00 - 09:30
Status: Pendente

[Confirmar] [Recusar] [Remarcar]
```

---

# 96. Ações do médico por status

## PENDENTE

Ações:

```text
Confirmar
Recusar
Remarcar
```

Confirmar:

```text
PENDENTE → CONFIRMADA
```

Recusar:

```text
PENDENTE → RECUSADA
```

## CONFIRMADA

Ações:

```text
Remarcar
Desmarcar
```

Desmarcar:

```text
CONFIRMADA → CANCELADA
```

Posteriormente também poderão existir:

```text
CONFIRMADA → REALIZADA
CONFIRMADA → FALTOU
```

---

# 97. Remarcação pelo médico

O médico não deve digitar um horário arbitrário.

A remarcação deverá respeitar a agenda e os slots realmente livres.

Fluxo:

```text
Médico clica Remarcar
        ↓
Modal abre
        ↓
Escolhe nova data
        ↓
Sistema busca slots disponíveis
        ↓
Médico seleciona um slot
        ↓
Backend revalida
        ↓
Agendamento é atualizado
```

O horário antigo deve ser liberado quando a remarcação for concluída, e o novo passa a ser ocupado.

---

# 98. Modal de remarcação planejado

Exemplo visual:

```text
Remarcar consulta

Paciente
João da Silva

Nova data
[18/09/2026]

Horários disponíveis

[08:00]
[08:30]
[10:00]
[14:30]

[Voltar] [Confirmar remarcação]
```

A disponibilidade exibida no modal não substitui a validação final do backend.

---

# 99. Endpoints planejados para as ações do médico

Serão adicionados endpoints semelhantes a:

```text
PATCH /agendamentos/:id/confirmar
PATCH /agendamentos/:id/recusar
PATCH /agendamentos/:id/cancelar
PATCH /agendamentos/:id/remarcar
```

Todos deverão exigir:

```text
authMiddleware
permitirPerfis("MEDICO")
```

---

# 100. Segurança das ações do médico

Não será suficiente receber o `id` do agendamento e atualizá-lo.

O backend deverá verificar se o agendamento pertence ao médico autenticado.

Regra:

```text
agendamento.medicoId === medico.id
```

Ataque que deve ser impedido:

```text
Médico A descobre ID de consulta do Médico B
        ↓
tenta confirmar/cancelar
        ↓
backend identifica Médico A
        ↓
compara medicoId
        ↓
não pertence ao Médico A
        ↓
operação bloqueada
```

---

# 101. PRÓXIMO PASSO IMEDIATO — contract.prisma

O desenvolvimento deve continuar exatamente por:

```text
backend/src/prisma/contract.prisma
```

Primeiro será atualizado o enum `StatusAgendamento`.

Objetivo:

```prisma
enum StatusAgendamento {
  PENDENTE
  CONFIRMADA
  REALIZADA
  RECUSADA
  CANCELADA
  FALTOU
}
```

Depois o model `Agendamento` deverá utilizar:

```prisma
status StatusAgendamento @default(PENDENTE)
```

---

# 102. Cuidado com registros AGENDADA existentes

Como o sistema já criou agendamentos, podem existir registros:

```text
status = AGENDADA
```

Por isso a mudança do enum não deve ser aplicada de forma destrutiva.

Antes de remover `AGENDADA`, deve-se garantir uma estratégia segura para os registros antigos.

A ordem da atualização do enum PostgreSQL e dos dados precisa respeitar o funcionamento do Contract ORM.

---

# 103. Próximo passo após o contract.prisma

Depois da definição do contrato:

```text
contract.prisma
        ↓
contract emit
        ↓
db update
        ↓
db verify
        ↓
npx tsc --noEmit
```

Comandos já utilizados no projeto:

```bash
npx prisma contract emit
npx prisma db update
npx prisma db verify
npx tsc --noEmit
```

Os comandos exatos devem ser confirmados com o estado atual do `package.json`/Prisma antes de executar qualquer operação destrutiva.

---

# 104. Próximo arquivo — agendamento.service.ts

Depois do banco:

```text
backend/src/services/agendamento.service.ts
```

Alterações principais:

1. criar novos registros com `PENDENTE`;
2. considerar `PENDENTE` e `CONFIRMADA` como ocupados;
3. criar função de confirmação;
4. criar função de recusa;
5. criar função de cancelamento;
6. criar função de remarcação;
7. validar propriedade do agendamento;
8. validar transições de status.

---

# 105. Transições de status que o service deverá aceitar

Inicialmente:

```text
PENDENTE → CONFIRMADA
PENDENTE → RECUSADA
PENDENTE → remarcação

CONFIRMADA → CANCELADA
CONFIRMADA → remarcação
```

Posteriormente:

```text
CONFIRMADA → REALIZADA
CONFIRMADA → FALTOU
```

Transições incompatíveis devem ser recusadas.

---

# 106. Próximo arquivo — agendamento.controller.ts

O controller deverá receber as novas ações.

Responsabilidades:

- validar `req.usuario`;
- validar `req.params.id`;
- validar body da remarcação;
- identificar médico;
- chamar service;
- converter erros de negócio em status HTTP;
- retornar JSON.

---

# 107. Próximo arquivo — agendamento.routes.ts

As novas rotas serão conectadas aos controllers.

Exemplo conceitual:

```ts
router.patch(
  "/:id/confirmar",
  authMiddleware,
  permitirPerfis("MEDICO"),
  confirmarAgendamento
);
```

O mesmo padrão será utilizado para recusar, cancelar e remarcar.

---

# 108. Próxima alteração no Agenda.tsx

Somente depois do backend estar funcionando será alterada a interface do médico.

Não será feita a interface antes da regra existir no backend.

Na aba `Horários marcados`:

```text
PENDENTE
→ Confirmar
→ Recusar
→ Remarcar
```

```text
CONFIRMADA
→ Remarcar
→ Desmarcar
```

Após uma ação bem-sucedida, a lista deverá ser recarregada.

---

# 109. Próxima alteração no MeusAgendamentos.tsx

O paciente deverá enxergar o estado real.

Exemplos:

```text
PENDENTE
Aguardando confirmação do médico
```

```text
CONFIRMADA
Consulta confirmada
```

```text
RECUSADA
Solicitação recusada
```

```text
CANCELADA
Consulta cancelada
```

---

# 110. Testes obrigatórios do novo fluxo

## Teste 1 — solicitação

```text
Paciente solicita 09:00
→ cria PENDENTE
→ 09:00 deixa de aparecer livre
```

## Teste 2 — confirmação

```text
Médico confirma
→ CONFIRMADA
→ paciente passa a ver confirmação
```

## Teste 3 — recusa

```text
Médico recusa
→ RECUSADA
→ slot antigo volta a aparecer livre
```

## Teste 4 — cancelamento

```text
Médico desmarca CONFIRMADA
→ CANCELADA
→ slot é liberado
```

## Teste 5 — remarcação

```text
Médico seleciona novo slot
→ backend revalida
→ antigo libera
→ novo ocupa
```

## Teste 6 — propriedade

```text
Médico A tenta alterar consulta do Médico B
→ backend bloqueia
```

## Teste 7 — concorrência

```text
Dois pacientes tentam o mesmo slot
→ apenas uma solicitação pode reservar o horário
```

---

# 111. Funcionalidades que devem ser preservadas durante essa mudança

Não devem ser quebrados:

- login;
- JWT;
- primeiro acesso;
- redefinição de senha;
- cadastro de médicos;
- cadastro de pacientes;
- edição de pacientes;
- liberação de acesso;
- agenda por data;
- prevenção de conflito;
- modal do dia;
- remoção de disponibilidade;
- adicionar horário pelo modal;
- configuração desktop;
- fluxo mobile;
- tema claro;
- tema escuro;
- calendário mobile maior;
- destaque verde;
- geração de slots;
- validação backend;
- `Meus agendamentos`;
- `Horários marcados`;
- nome e telefone do paciente.

---

# 112. Otimização futura — disponibilidade mensal

Atualmente o calendário do paciente pode consultar vários dias individualmente para descobrir a quantidade de horários livres.

Uma otimização futura será criar:

```text
GET /agendamentos/disponibilidade-mensal?ano=2026&mes=9
```

Exemplo:

```json
{
  "dias": [
    {
      "data": "2026-09-15",
      "quantidade": 6
    },
    {
      "data": "2026-09-16",
      "quantidade": 4
    }
  ]
}
```

Isso reduzirá aproximadamente 28–31 chamadas mensais para uma única requisição.

Essa otimização não é o próximo passo imediato.

---

# 113. Regra de trabalho para as próximas alterações

Para evitar regressões:

```text
1. identificar o arquivo exato;
2. preservar tudo que já funciona;
3. alterar apenas a regra necessária;
4. executar npx tsc --noEmit;
5. testar o endpoint;
6. testar a interface;
7. somente então avançar.
```

Warnings amarelos do editor devem ser investigados pelo texto exato antes de alterar o código.

---

# 114. Estado consolidado do projeto em 14/09/2026

## Já implementado

```text
Backend Node/Express/TypeScript
PostgreSQL
Prisma Contract ORM
JWT
bcrypt
controle de perfil
primeiro acesso
redefinição de senha
email
médicos
pacientes
liberação de acesso
área médica
área do paciente
tema claro/escuro
responsividade
agenda por data
disponibilidades
prevenção de conflitos
exclusão lógica
modal do dia
adicionar horário via modal
configuração desktop
fluxo mobile
geração de slots
horários disponíveis
criação de agendamento
Meus agendamentos
Horários marcados
nome e telefone do paciente
calendário mobile ampliado
destaque visual dos dias disponíveis
```

## Próxima implementação

```text
PENDENTE
CONFIRMAR
RECUSAR
REMARCAR
DESMARCAR
```

## Depois

```text
REALIZADA
FALTOU
CONSULTA
PRONTUÁRIO
HISTÓRICO
```

---

# 115. Fluxo alvo após a próxima implementação

```text
┌─────────────────────────────────────┐
│ MÉDICO                              │
│ cria disponibilidade                │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ BACKEND                             │
│ gera slots livres                   │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ PACIENTE                            │
│ escolhe data e horário              │
└──────────────────┬──────────────────┘
                   ↓
┌─────────────────────────────────────┐
│ AGENDAMENTO                         │
│ PENDENTE                            │
└──────────────────┬──────────────────┘
                   ↓
            slot reservado
                   ↓
┌─────────────────────────────────────┐
│ MÉDICO                              │
│ analisa solicitação                 │
└─────────────┬─────────────┬─────────┘
              ↓             ↓
        CONFIRMAR         RECUSAR
              ↓             ↓
        CONFIRMADA       RECUSADA
              ↓             ↓
     paciente acompanha   slot libera
              ↓
      ┌───────┴────────┐
      ↓                ↓
   REMARCAR         DESMARCAR
      ↓                ↓
 novo slot          CANCELADA
```

---

# 116. Ponto exato de continuidade

Ao continuar o desenvolvimento a partir deste documento, não é necessário refazer:

```text
Agendamento
Slots
AgendarConsulta
MeusAgendamentos
Horários marcados
Integração paciente/médico
Calendário responsivo
Modais de disponibilidade
```

O próximo arquivo é:

```text
backend/src/prisma/contract.prisma
```

Objetivo imediato:

```text
adicionar PENDENTE
adicionar RECUSADA
preparar default PENDENTE
preservar registros antigos
```

Depois:

```text
agendamento.service.ts
        ↓
agendamento.controller.ts
        ↓
agendamento.routes.ts
        ↓
Agenda.tsx
        ↓
MeusAgendamentos.tsx
        ↓
modal de remarcação
```

---

# 117. Conclusão da atualização incremental

O projeto agora possui a ligação funcional:

```text
Disponibilidade do médico
        ↓
Slot disponível
        ↓
Escolha do paciente
        ↓
Agendamento
        ↓
Meus agendamentos
        ↓
Horários marcados do médico
```

A próxima etapa transforma esse fluxo em:

```text
Disponibilidade
        ↓
Solicitação do paciente
        ↓
PENDENTE
        ↓
Decisão do médico
        ↓
CONFIRMADA ou RECUSADA
        ↓
REMARCAÇÃO / CANCELAMENTO
```

Somente depois de consolidar esse ciclo será recomendável avançar para a fase de atendimento, `REALIZADA`, `FALTOU` e prontuário eletrônico.

---

# 118. Continuidade executada após o ponto 117

A etapa que estava indicada como próxima implementação foi executada. O objetivo desta fase foi transformar o agendamento simples em um fluxo de solicitação e decisão médica, sem remover ou quebrar as funcionalidades que já estavam prontas.

O fluxo anterior era:

```text
Disponibilidade do médico
        ↓
Paciente escolhe um slot
        ↓
Agendamento criado como AGENDADA
        ↓
Paciente visualiza em Meus agendamentos
        ↓
Médico visualiza em Horários marcados
```

O fluxo implementado passou a ser:

```text
Disponibilidade do médico
        ↓
Paciente escolhe um slot livre
        ↓
Backend cria PENDENTE
        ↓
Slot deixa de aparecer como livre
        ↓
Médico visualiza a solicitação
        ↓
┌────────────────┬────────────────┬────────────────┐
↓                ↓                ↓
CONFIRMAR        RECUSAR          REMARCAR
↓                ↓                ↓
CONFIRMADA       RECUSADA         novo slot
↓                ↓
REMARCAR         slot liberado
ou
DESMARCAR
↓
CANCELADA
↓
slot liberado
```

A implementação foi feita de forma incremental, validando banco, contrato do Prisma, TypeScript, backend e frontend antes de avançar para a próxima camada.

---

# 119. Alteração do enum StatusAgendamento

O `contract.prisma` foi atualizado para suportar os novos estados necessários ao fluxo de aprovação pelo médico.

Antes, os estados existentes eram:

```prisma
enum StatusAgendamento {
  AGENDADA
  CONFIRMADA
  REALIZADA
  CANCELADA
  FALTOU
}
```

A nova estrutura ficou:

```prisma
enum StatusAgendamento {
  AGENDADA
  PENDENTE
  CONFIRMADA
  REALIZADA
  RECUSADA
  CANCELADA
  FALTOU
}
```

O status `AGENDADA` foi mantido temporariamente por compatibilidade com registros antigos já existentes no banco.

O objetivo futuro é retirar `AGENDADA` depois que todos os registros legados tiverem sido analisados e migrados de forma controlada.

---

# 120. Alteração do status padrão do Agendamento

Além de adicionar `PENDENTE` e `RECUSADA`, o valor padrão do campo `status` no modelo `Agendamento` foi alterado.

Antes:

```prisma
status StatusAgendamento @default(AGENDADA)
```

Depois:

```prisma
status StatusAgendamento @default(PENDENTE)
```

Com isso, uma nova solicitação feita pelo paciente passa a nascer como:

```text
PENDENTE
```

Isso representa corretamente a regra definida para o consultório: o paciente solicita o horário, mas o médico ainda precisa aceitar a consulta.

---

# 121. Problema encontrado com arquivo não salvo no VS Code

Durante a alteração do contrato, o editor mostrava o código modificado, porém o arquivo em disco ainda continha o enum antigo.

O problema foi identificado utilizando:

```bash
grep -A12 -n "enum StatusAgendamento" src/prisma/contract.prisma
```

O resultado ainda mostrava somente os estados antigos.

Também foi verificado o arquivo de tipos gerado:

```bash
grep -n "PENDENTE" src/prisma/contract.d.ts
```

Como não havia resultado, ficou confirmado que o `contract emit` ainda estava usando o contrato antigo salvo em disco.

Depois da correção e salvamento, a verificação passou a mostrar:

```text
13:enum StatusAgendamento {
14-  AGENDADA
15-  PENDENTE
16-  CONFIRMADA
17-  REALIZADA
18-  RECUSADA
19-  CANCELADA
20-  FALTOU
21-}
```

Essa situação reforçou uma regra prática para o desenvolvimento:

```text
Não confiar somente no conteúdo visual do editor.
Sempre confirmar o arquivo real com grep/cat quando houver inconsistência.
```

---

# 122. Regeneração do contrato Prisma

Após salvar corretamente o `contract.prisma`, foi executado:

```bash
npx prisma contract emit
```

O objetivo foi regenerar:

```text
contract.json
contract.d.ts
```

Depois disso, `PENDENTE` e `RECUSADA` passaram a existir também nos tipos TypeScript gerados pelo Prisma Contract ORM.

Isso resolveu os erros em que o TypeScript informava que:

```text
"PENDENTE" não era atribuível ao tipo StatusAgendamento
```

---

# 123. Primeiro erro ao executar prisma db update

Na primeira tentativa de atualizar o banco com:

```bash
npx prisma db update
```

houve conflito com uma restrição `CHECK` já existente na tabela `agendamento`.

O banco ainda possuía uma regra que permitia somente:

```text
AGENDADA
CONFIRMADA
REALIZADA
CANCELADA
FALTOU
```

Portanto, mesmo que o contrato já conhecesse `PENDENTE` e `RECUSADA`, o PostgreSQL ainda rejeitaria esses valores.

O `db update` não conseguiu concluir automaticamente a transição naquele momento.

---

# 124. Inspeção direta do PostgreSQL

Como o comando `psql` não estava disponível diretamente no PATH do macOS, foi utilizado o executável fornecido pelo Postgres.app:

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql
```

A inspeção mostrou a restrição:

```text
agendamento_status_check_46d5956a
```

com a regra equivalente a:

```sql
CHECK (
  status = ANY (
    ARRAY[
      'AGENDADA'::text,
      'CONFIRMADA'::text,
      'REALIZADA'::text,
      'CANCELADA'::text,
      'FALTOU'::text
    ]
  )
)
```

Também foi identificado que o default do banco ainda era:

```text
AGENDADA
```

E havia um registro antigo com:

```text
AGENDADA | 1
```

Esse registro foi preservado intencionalmente.

---

# 125. Migração manual segura da restrição CHECK

Para evitar perda do registro legado, a restrição foi atualizada manualmente dentro de uma transação.

Foi utilizada a seguinte lógica:

```sql
BEGIN;

ALTER TABLE agendamento
DROP CONSTRAINT agendamento_status_check_46d5956a;

ALTER TABLE agendamento
ALTER COLUMN status SET DEFAULT 'PENDENTE'::text;

ALTER TABLE agendamento
ADD CONSTRAINT agendamento_status_check_46d5956a
CHECK (
  status = ANY (
    ARRAY[
      'AGENDADA'::text,
      'PENDENTE'::text,
      'CONFIRMADA'::text,
      'REALIZADA'::text,
      'RECUSADA'::text,
      'CANCELADA'::text,
      'FALTOU'::text
    ]
  )
);

COMMIT;
```

Depois da operação, o banco passou a aceitar todos os estados necessários sem alterar o registro antigo.

---

# 126. Prisma db update concluído após ajuste do banco

Depois da correção manual da restrição, foi executado novamente:

```bash
npx prisma db update
```

Dessa vez a atualização foi concluída.

O Prisma substituiu a restrição manual pela restrição gerenciada pelo próprio contrato.

A antiga:

```text
agendamento_status_check_46d5956a
```

foi substituída por:

```text
agendamento_status_check_ea658e59
```

Também foi atualizado o marker do contrato para:

```text
a3fc2948462eb98695593c3e1f8d29a8446aa8cb7f4731ec8bc864fc7e43f357
```

---

# 127. Verificação final do banco e contrato

Foi executado:

```bash
npx prisma db verify
```

O retorno confirmou:

```text
Database marker and schema match contract
```

Isso significa que:

```text
contract.prisma
        ↓
contract gerado
        ↓
marker Prisma
        ↓
estrutura do PostgreSQL
```

estavam novamente sincronizados.

Também foi executado:

```bash
npx tsc --noEmit
```

sem erros.

---

# 128. Estado final do enum após a migração

O banco e o backend passaram a reconhecer:

```text
AGENDADA    ← legado temporário
PENDENTE    ← nova solicitação do paciente
CONFIRMADA  ← aceita pelo médico
REALIZADA   ← reservado para fase de atendimento
RECUSADA    ← solicitação recusada
CANCELADA   ← consulta confirmada posteriormente desmarcada
FALTOU      ← reservado para fase de atendimento
```

O default passou a ser:

```text
PENDENTE
```

---

# 129. Atualização do agendamento.service.ts

O service de agendamentos foi atualizado para centralizar a nova regra de negócio.

Foi criado o tipo:

```ts
export type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";
```

O tipo `AgendamentoRegistro` passou a utilizar:

```ts
status: StatusAgendamento;
```

em vez de uma união antiga incompleta.

---

# 130. Regra central de ocupação de slot

Foi criada uma regra para determinar quais estados ainda ocupam um horário.

Conceitualmente:

```ts
function statusOcupaHorario(
  status: StatusAgendamento
) {
  return (
    status === "PENDENTE" ||
    status === "AGENDADA" ||
    status === "CONFIRMADA"
  );
}
```

Portanto:

```text
PENDENTE    → ocupa
AGENDADA    → ocupa por compatibilidade
CONFIRMADA  → ocupa
RECUSADA    → não ocupa
CANCELADA   → não ocupa
REALIZADA   → não ocupa na lógica atual de disponibilidade futura
FALTOU      → não ocupa na lógica atual de disponibilidade futura
```

Essa regra é usada ao calcular slots livres.

---

# 131. Criação do agendamento passou a usar PENDENTE

A função `criarAgendamento` deixou de criar:

```ts
status: "AGENDADA"
```

E passou a criar:

```ts
status: "PENDENTE"
```

O paciente, portanto, não confirma sozinho uma consulta.

Fluxo real:

```text
Paciente escolhe slot
        ↓
Backend valida novamente
        ↓
Cria PENDENTE
        ↓
Slot fica reservado
        ↓
Médico decide
```

---

# 132. Busca segura de agendamento pelo médico

Foi adicionada uma função semelhante a:

```ts
export async function buscarAgendamentoDoMedicoPorId(
  id: number,
  medicoId: number
): Promise<AgendamentoRegistro> {

  const agendamento =
    await db.orm.public.Agendamento
      .where({
        id,
        medicoId
      })
      .first();

  if (!agendamento) {
    throw new Error(
      "Agendamento não encontrado."
    );
  }

  return agendamento;
}
```

A consulta utiliza simultaneamente:

```text
id do agendamento
+
medicoId autenticado
```

Isso impede que um médico modifique um agendamento pertencente a outro médico apenas alterando o ID na URL.

---

# 133. Confirmar agendamento

Foi implementada a ação de confirmação.

Transição principal:

```text
PENDENTE
   ↓
CONFIRMADA
```

Por compatibilidade temporária, `AGENDADA` também pode ser confirmada.

A função valida:

```text
1. agendamento existe;
2. pertence ao médico autenticado;
3. status permite confirmação;
4. atualização é realizada no banco.
```

Endpoint conectado posteriormente:

```text
PATCH /agendamentos/:id/confirmar
```

---

# 134. Recusar agendamento

Foi implementada a ação de recusa.

Fluxo:

```text
PENDENTE
   ↓
RECUSADA
```

Também há compatibilidade temporária com `AGENDADA`.

Depois da recusa:

```text
RECUSADA
   ↓
não ocupa o slot
   ↓
horário volta a aparecer para pacientes
```

Endpoint:

```text
PATCH /agendamentos/:id/recusar
```

---

# 135. Cancelar ou desmarcar consulta

Foi criada a ação usada pelo médico para desmarcar uma consulta já aceita.

Fluxo principal:

```text
CONFIRMADA
    ↓
CANCELADA
```

O registro continua existindo para histórico, mas deixa de bloquear o horário.

Por compatibilidade, `AGENDADA` também pode ser tratada nessa fase enquanto existirem registros legados.

Endpoint:

```text
PATCH /agendamentos/:id/cancelar
```

Na interface do médico, a ação é apresentada ao usuário como:

```text
Desmarcar
```

---

# 136. Remarcação de consulta

Também foi implementada a remarcação pelo médico.

O frontend envia somente:

```json
{
  "data": "2026-09-20",
  "horaInicio": "10:00"
}
```

O frontend não define `horaFim` arbitrariamente.

O service:

```text
1. busca o agendamento do médico;
2. valida se o status permite remarcação;
3. impede selecionar exatamente o mesmo horário atual;
4. consulta os slots reais do médico;
5. verifica se o novo slot continua livre;
6. obtém o horaFim verdadeiro;
7. atualiza data, horaInicio e horaFim;
8. mantém o status atual.
```

Endpoint:

```text
PATCH /agendamentos/:id/remarcar
```

Estados atualmente permitidos para remarcação:

```text
PENDENTE
AGENDADA
CONFIRMADA
```

---

# 137. Transições de status implementadas

O conjunto de transições implementado nesta fase é:

```text
PENDENTE
  ├── CONFIRMADA
  ├── RECUSADA
  └── REMARCAÇÃO

AGENDADA (legado)
  ├── CONFIRMADA
  ├── RECUSADA
  ├── CANCELADA
  └── REMARCAÇÃO

CONFIRMADA
  ├── CANCELADA
  └── REMARCAÇÃO
```

Transições reservadas para uma fase posterior:

```text
CONFIRMADA → REALIZADA
CONFIRMADA → FALTOU
```

---

# 138. Atualização do agendamento.controller.ts

O controller existente foi preservado e recebeu as novas ações do médico.

Continuaram existindo:

```text
horariosDisponiveis
agendarConsulta
meusAgendamentos
agendamentosMedico
```

Foram adicionados:

```text
confirmarAgendamentoController
recusarAgendamentoController
cancelarAgendamentoController
remarcarAgendamentoController
```

Cada controller:

```text
1. valida autenticação;
2. valida parâmetros;
3. identifica o médico pelo JWT;
4. chama o service;
5. converte erros de negócio em status HTTP apropriado;
6. devolve JSON ao frontend.
```

---

# 139. Correção de tipagem em req.params.id

Ao adicionar as rotas com `:id`, o TypeScript apresentou erro em:

```ts
req.params.id
```

Isso ocorreu por diferença de tipagem da versão atual do Express/TypeScript, em que o valor pode não ser inferido estritamente como `string`.

A função auxiliar foi ajustada para receber:

```ts
unknown
```

Exemplo:

```ts
function obterIdAgendamento(
  idRecebido: unknown
): number | null {

  if (
    typeof idRecebido !== "string" ||
    idRecebido.trim() === ""
  ) {
    return null;
  }

  const id = Number(idRecebido);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}
```

Isso tornou a validação independente da variação de tipagem de `req.params`.

---

# 140. Mensagem de criação de consulta atualizada

Como a consulta não é mais automaticamente confirmada, a resposta de criação deixou de comunicar simplesmente que a consulta foi agendada.

A lógica passou a retornar uma mensagem equivalente a:

```text
Solicitação enviada. Aguarde a confirmação do médico.
```

Isso mantém a interface coerente com o novo status `PENDENTE`.

---

# 141. Atualização do agendamento.routes.ts

As rotas do paciente foram mantidas:

```text
GET  /agendamentos/horarios-disponiveis
POST /agendamentos
GET  /agendamentos/meus
```

As rotas do médico passaram a incluir:

```text
GET   /agendamentos/medico
PATCH /agendamentos/:id/confirmar
PATCH /agendamentos/:id/recusar
PATCH /agendamentos/:id/cancelar
PATCH /agendamentos/:id/remarcar
```

Todas as ações de alteração usam:

```text
authMiddleware
        ↓
permitirPerfis("MEDICO")
        ↓
controller
```

O paciente não consegue chamar as ações exclusivas do médico através das rotas oficiais.

---

# 142. Organização atual dos endpoints de agendamento

## Paciente

```text
GET /agendamentos/horarios-disponiveis?data=YYYY-MM-DD
```

Função:

```text
listar slots ainda livres para a data selecionada
```

```text
POST /agendamentos
```

Body:

```json
{
  "data": "2026-09-18",
  "horaInicio": "08:30"
}
```

Cria:

```text
PENDENTE
```

```text
GET /agendamentos/meus
```

Retorna os agendamentos do paciente autenticado.

## Médico

```text
GET /agendamentos/medico
```

Retorna os agendamentos do médico autenticado enriquecidos com dados do paciente necessários à tela, como nome e telefone.

```text
PATCH /agendamentos/:id/confirmar
PATCH /agendamentos/:id/recusar
PATCH /agendamentos/:id/cancelar
PATCH /agendamentos/:id/remarcar
```

---

# 143. Atualização do Agenda.tsx do médico

A aba `Horários marcados` deixou de ser somente uma visualização passiva.

Ela passou a oferecer ações conforme o status.

Para `PENDENTE`:

```text
Confirmar
Recusar
Remarcar
```

Para `AGENDADA` legado:

```text
Confirmar
Recusar
Remarcar
```

Para `CONFIRMADA`:

```text
Remarcar
Desmarcar
```

Para estados encerrados:

```text
RECUSADA
CANCELADA
REALIZADA
FALTOU
```

não são exibidas as mesmas ações de alteração do fluxo ativo.

---

# 144. Tipagem de status no frontend da agenda

Foi criado no `Agenda.tsx`:

```ts
type StatusAgendamento =
  | "AGENDADA"
  | "PENDENTE"
  | "CONFIRMADA"
  | "REALIZADA"
  | "RECUSADA"
  | "CANCELADA"
  | "FALTOU";
```

O tipo `Agendamento` passou a utilizar esse tipo no campo:

```ts
status: StatusAgendamento;
```

Isso evita trabalhar com qualquer texto arbitrário no frontend para estados conhecidos do sistema.

---

# 145. Exibição amigável dos status na agenda médica

Os nomes técnicos do banco são convertidos em textos mais amigáveis.

Exemplos:

```text
PENDENTE   → Aguardando confirmação
CONFIRMADA → Confirmada
RECUSADA   → Recusada
CANCELADA  → Cancelada
REALIZADA  → Realizada
FALTOU     → Faltou
AGENDADA   → Agendada
```

A interface não precisa expor diretamente ao usuário todos os nomes internos em caixa alta.

---

# 146. Modal de confirmação das ações do médico

Antes de ações sensíveis, o frontend passou a abrir um modal.

A mesma estrutura de modal é reutilizada para:

```text
confirmar
recusar
desmarcar
```

O modal exibe:

```text
paciente
data
horário
descrição da ação
botão voltar
botão de confirmação
estado de carregamento
```

Isso evita alterações acidentais e mantém consistência visual com os outros modais da agenda.

---

# 147. Modal de remarcação

Foi criado um modal específico para remarcação.

Ele mostra:

```text
nome do paciente
horário atual
nova data
slots disponíveis
botão voltar
botão confirmar remarcação
```

O usuário não digita manualmente qualquer horário.

Ele seleciona um slot calculado a partir das disponibilidades do médico.

Mesmo assim, o backend revalida o slot antes de salvar.

Portanto, o frontend é apenas uma ajuda de interface; a regra definitiva continua no backend.

---

# 148. Cálculo visual de slots na remarcação

No frontend, os períodos de disponibilidade são transformados em slots utilizando:

```text
horaInicio
horaFim
duracaoConsulta
```

Exemplo:

```text
08:00 → 10:00
Duração: 30
```

gera:

```text
08:00 → 08:30
08:30 → 09:00
09:00 → 09:30
09:30 → 10:00
```

Depois são removidos os horários ocupados por:

```text
PENDENTE
AGENDADA
CONFIRMADA
```

O próprio agendamento que está sendo remarcado é ignorado na comparação para permitir a análise correta de outros slots.

O mesmo horário atual é retirado das opções para evitar uma remarcação sem mudança real.

---

# 149. Atualização automática após ações do médico

Depois de confirmar, recusar, desmarcar ou remarcar, o frontend chama novamente:

```text
GET /agendamentos/medico
```

Assim a lista é reconstruída com os dados reais do banco.

Isso evita depender somente de alterações locais no estado React.

---

# 150. Novo CSS da agenda médica

O arquivo `agenda.css` foi ampliado para estilizar o novo fluxo sem remover o calendário já existente.

Foram adicionadas classes para:

```text
agenda-status-pendente
agenda-status-confirmada
agenda-status-recusada
agenda-status-cancelada
agenda-status-realizada
agenda-status-faltou
agenda-status-agendada
```

Também foram adicionadas classes de ação:

```text
agenda-marcado-acoes
agenda-acao-confirmar
agenda-acao-recusar
agenda-acao-remarcar
agenda-acao-cancelar
```

E classes do modal de remarcação:

```text
agenda-modal-remarcacao
agenda-remarcacao-atual
agenda-remarcacao-horarios
agenda-remarcacao-grid
agenda-remarcacao-slot
agenda-remarcacao-slot-active
agenda-remarcacao-vazio
```

---

# 151. Cores dos status na agenda médica

A identidade visual adotada foi:

```text
PENDENTE    → amarelo
CONFIRMADA  → verde
RECUSADA    → vermelho
CANCELADA   → cinza
REALIZADA   → azul
FALTOU      → laranja
AGENDADA    → índigo/legado
```

Os mesmos conceitos foram adaptados ao tema escuro.

Isso permite identificar rapidamente a situação de cada atendimento sem depender somente da leitura do texto.

---

# 152. Responsividade das ações da agenda

No desktop, as ações ficam organizadas abaixo das informações da consulta.

Em telas menores, o layout é reorganizado.

Em celular:

```text
card em uma coluna
        ↓
informações empilhadas
        ↓
botões distribuídos em grid
        ↓
em telas muito pequenas, uma ação por linha
```

O formulário lateral de configuração de horário continua escondido no celular, preservando a decisão anterior de utilizar o calendário e os modais como principal interação mobile.

---

# 153. Tema escuro da nova agenda

Todos os elementos adicionados receberam estilos específicos para:

```css
body.modo-escuro
```

Isso inclui:

```text
status
botões de ação
modal de confirmação
modal de remarcação
slots
slot selecionado
alertas
cards
bordas
fundos
textos
```

Portanto, a nova funcionalidade não ficou limitada ao tema claro.

---

# 154. Ajuste do tsconfig.app.json

Durante o desenvolvimento do frontend, o VS Code marcou erro na opção:

```json
"erasableSyntaxOnly": true
```

O arquivo estava estruturalmente correto.

O problema era a versão do TypeScript usada pelo editor, diferente da versão do projeto.

A solução foi fazer o VS Code utilizar a versão do workspace através de:

```text
Cmd + Shift + P
        ↓
TypeScript: Select TypeScript Version
        ↓
Use Workspace Version
```

Depois foi utilizado:

```text
TypeScript: Restart TS Server
```

Caso necessário, também pode ser usado:

```text
Developer: Reload Window
```

Não foi necessário remover `erasableSyntaxOnly` do `tsconfig.app.json`.

---

# 155. Comandos atuais para executar o projeto

O projeto utiliza dois terminais.

## Backend

```bash
cd backend
npm run dev
```

Servidor esperado:

```text
http://localhost:3000
```

## Frontend

```bash
cd frontend
npm run dev
```

Servidor Vite normalmente disponível em:

```text
http://localhost:5173
```

O Postgres.app precisa estar ativo para que o backend consiga acessar o banco.

---

# 156. Validação TypeScript atual

Para verificar o backend:

```bash
cd backend
npx tsc --noEmit
```

Para verificar o frontend:

```bash
cd frontend
npx tsc --noEmit
```

Durante esta etapa, essas verificações foram usadas antes de avançar para a camada seguinte.

---

# 157. Reformulação visual de MeusAgendamentos.tsx

A página `MeusAgendamentos.tsx` anteriormente reutilizava:

```text
inicioPaciente.css
```

Isso limitava a identidade visual da página e misturava estilos de módulos diferentes.

Foi criado um CSS específico:

```text
src/styles/meusAgendamentos.css
```

E o componente passou a importar:

```ts
import "../../styles/meusAgendamentos.css";
```

A lógica de carregamento continuou utilizando:

```text
GET /agendamentos/meus
```

---

# 158. Novo visual de Meus agendamentos

A tela passou a seguir o padrão visual do restante do sistema.

Elementos adicionados:

```text
cabeçalho próprio
subtítulo
contador de agendamentos
cards individuais
linha lateral azul
badge de status
horário destacado
descrição textual do status
estado de carregamento
estado vazio
estado de erro
botão Tentar novamente
responsividade
tema escuro
```

A página não depende mais visualmente do card genérico da tela inicial do paciente.

---

# 159. Status exibidos para o paciente

A página de agendamentos do paciente passou a reconhecer explicitamente:

```text
PENDENTE
AGENDADA
CONFIRMADA
REALIZADA
RECUSADA
CANCELADA
FALTOU
```

Os textos apresentados são:

```text
PENDENTE   → Aguardando confirmação
AGENDADA   → Agendada
CONFIRMADA → Confirmada
REALIZADA  → Realizada
RECUSADA   → Recusada
CANCELADA  → Cancelada
FALTOU     → Faltou
```

---

# 160. Descrição complementar do status para o paciente

Além do badge, o paciente recebe uma explicação textual.

Exemplos:

```text
PENDENTE
Sua solicitação foi enviada e aguarda a confirmação do médico.
```

```text
CONFIRMADA
Sua consulta foi confirmada pelo médico.
```

```text
RECUSADA
Esta solicitação não foi aceita pelo médico.
```

```text
CANCELADA
Esta consulta foi cancelada.
```

```text
REALIZADA
Esta consulta foi realizada.
```

```text
FALTOU
A consulta foi marcada como falta.
```

Isso torna a situação da consulta mais clara para o usuário final.

---

# 161. CSS específico de Meus agendamentos

O novo `meusAgendamentos.css` foi criado com estilos para:

```text
meus-agendamentos-page
meus-agendamentos-header
meus-agendamentos-eyebrow
meus-agendamentos-resumo
meus-agendamentos-lista
meus-agendamentos-card
meus-agendamentos-card-topo
meus-agendamentos-data
meus-agendamentos-status
meus-agendamentos-horario
meus-agendamentos-descricao
meus-agendamentos-indicador
meus-agendamentos-estado
meus-agendamentos-loading
meus-agendamentos-btn
```

Foram incluídos estilos para desktop, tablet, celular e tema escuro.

---

# 162. Próxima consulta abaixo do calendário do paciente

Foi adicionada uma nova funcionalidade na página `AgendarConsulta.tsx`.

Objetivo:

```text
mostrar logo abaixo do calendário somente a próxima consulta do paciente
```

As demais consultas continuam sendo visualizadas exclusivamente na tela:

```text
Meus agendamentos
```

Essa decisão mantém a tela de marcação simples e útil sem duplicar toda a lista de consultas.

---

# 163. Endpoint reutilizado para a próxima consulta

Não foi necessário criar um novo endpoint.

A página reutiliza:

```text
GET /agendamentos/meus
```

O frontend recebe todos os agendamentos, mas utiliza apenas o necessário para determinar o próximo atendimento.

---

# 164. Regra de seleção da próxima consulta

A lógica considera somente estados ainda ativos:

```text
PENDENTE
AGENDADA
CONFIRMADA
```

São ignorados:

```text
RECUSADA
CANCELADA
REALIZADA
FALTOU
```

Além disso, consultas cujo horário já passou não entram na seleção.

---

# 165. Ordenação da próxima consulta

Depois da filtragem, os agendamentos são ordenados por:

```text
data
+
horaInicio
```

Conceitualmente:

```text
2026-09-15 08:00
2026-09-15 10:00
2026-09-16 09:00
```

O frontend utiliza somente:

```text
primeiro item da lista ordenada
```

Portanto, mesmo que o paciente tenha várias consultas futuras, somente a cronologicamente mais próxima aparece abaixo do calendário.

---

# 166. Verificação de consulta já passada

Para evitar exibir uma consulta cuja data é hoje, mas cujo horário já terminou ou começou no passado, a lógica considera data e hora.

Conceitualmente:

```ts
const horarioConsulta =
  new Date(
    `${agendamento.data}T${agendamento.horaInicio}:00`
  );

return (
  horarioConsulta.getTime() >=
  Date.now()
);
```

Isso é mais preciso do que comparar somente `YYYY-MM-DD`.

---

# 167. Atualização da próxima consulta após novo agendamento

Depois que o paciente cria uma nova solicitação com sucesso, a página agora atualiza:

```text
horários do dia
        ↓
calendário mensal
        ↓
próxima consulta
```

A função de próxima consulta é chamada novamente após o `POST /agendamentos`.

Dessa forma, o card abaixo do calendário reflete imediatamente o novo estado do banco.

---

# 168. Remoção da seção temporária Consultas agendadas agora

Antes, `AgendarConsulta.tsx` mantinha um estado local chamado conceitualmente de:

```text
agendamentosRecentes
```

Esse estado mostrava somente os agendamentos realizados durante a sessão atual da página.

Essa abordagem foi substituída.

Agora a informação vem do banco através de:

```text
GET /agendamentos/meus
```

Assim, a próxima consulta continua aparecendo mesmo depois de atualizar a página ou entrar novamente no sistema.

---

# 169. Card da próxima consulta

O card abaixo do calendário mostra:

```text
Próxima consulta
Seu próximo atendimento
Data por extenso
Horário inicial e final
Status
```

Exemplo:

```text
Próxima consulta
Seu próximo atendimento

18 de setembro de 2026
09:00 - 09:30
Aguardando confirmação
```

O card reutiliza a identidade visual já existente na tela de agendamento.

---

# 170. CSS do status da próxima consulta

Foram adicionadas classes para o status do card abaixo do calendário.

Exemplos:

```text
agendamento-recente-status pendente
agendamento-recente-status confirmada
agendamento-recente-status agendada
```

Cores principais:

```text
PENDENTE   → amarelo
CONFIRMADA → verde
AGENDADA   → índigo
```

Também foram adicionadas versões específicas para:

```css
body.modo-escuro
```

---

# 171. Fluxo completo atual do paciente

O fluxo do paciente agora é:

```text
Médico cadastra paciente
        ↓
Médico libera acesso
        ↓
Paciente faz login
        ↓
Abre Agendar consulta
        ↓
Calendário consulta horários livres
        ↓
Paciente escolhe um dia disponível
        ↓
Modal mostra slots
        ↓
Paciente escolhe horário
        ↓
Modal pede confirmação
        ↓
POST /agendamentos
        ↓
PENDENTE
        ↓
slot fica reservado
        ↓
Próxima consulta aparece abaixo do calendário
        ↓
Paciente pode abrir Meus agendamentos
        ↓
visualiza todo o histórico de agendamentos
```

---

# 172. Fluxo completo atual do médico

O fluxo do médico ficou:

```text
Médico faz login
        ↓
Configura disponibilidades
        ↓
Paciente solicita um slot
        ↓
Horários marcados recebe PENDENTE
        ↓
Médico escolhe:
        ↓
┌──────────────┬──────────────┬──────────────┐
↓              ↓              ↓
Confirmar      Recusar        Remarcar
↓              ↓              ↓
CONFIRMADA     RECUSADA       novo horário
↓              ↓
Remarcar       slot liberado
ou
Desmarcar
↓
CANCELADA
↓
slot liberado
```

---

# 173. Regra de segurança preservada

O frontend nunca é considerado fonte confiável para:

```text
medicoId
pacienteId
horaFim
status final
propriedade do agendamento
```

Esses dados são calculados ou validados no backend.

Exemplo:

```text
frontend envia id do agendamento
        ↓
JWT identifica usuário
        ↓
backend identifica medico.id
        ↓
consulta usa id + medicoId
        ↓
somente o proprietário pode alterar
```

---

# 174. Regra de dupla validação de slot

Mesmo que o frontend mostre um horário como livre, o backend consulta novamente a disponibilidade antes de criar ou remarcar.

Isso é necessário porque entre:

```text
visualizar horário
        ↓
selecionar horário
        ↓
confirmar operação
```

outro usuário pode ocupar o mesmo slot.

A validação do frontend melhora a experiência, mas não substitui a validação do backend.

---

# 175. Concorrência ainda é um ponto futuro importante

A lógica atual faz uma consulta de disponibilidade antes da gravação.

Existe um cenário teórico de corrida:

```text
Paciente A consulta 09:00 → livre
Paciente B consulta 09:00 → livre
Paciente A grava
Paciente B grava quase simultaneamente
```

Uma proteção definitiva contra esse caso deve ser implementada posteriormente utilizando mecanismo atômico no banco, transação, constraint adequada ou estratégia equivalente compatível com o Prisma Contract ORM utilizado no projeto.

Esse ponto não foi esquecido e permanece como melhoria técnica antes da conclusão final do sistema.

---

# 176. Registro legado AGENDADA ainda existente

Durante a migração foi identificado pelo menos um registro antigo com:

```text
AGENDADA
```

Ele não foi convertido automaticamente porque seria incorreto assumir se aquele registro representa:

```text
uma consulta já aceita
ou
uma solicitação que deveria estar pendente
```

Por isso, `AGENDADA` permanece temporariamente no enum e nas regras de compatibilidade.

Antes de remover esse estado será necessário:

```text
1. listar registros AGENDADA;
2. analisar o significado de cada registro;
3. converter para o estado correto;
4. confirmar que não restou AGENDADA;
5. retirar do contrato;
6. atualizar banco e tipos novamente.
```

---

# 177. Git e envio da nova etapa

Depois da implementação, o fluxo indicado para enviar as alterações para a branch de desenvolvimento foi:

```bash
git status
git branch --show-current
git add .
git status
git commit -m "Atualiza fluxo de agendamentos e interface da agenda"
git pull --rebase origin desenvolvimento
git push origin desenvolvimento
```

A branch utilizada no desenvolvimento é:

```text
desenvolvimento
```

A verificação com `git status` antes e depois de `git add .` é importante para evitar versionar arquivos indevidos.

---

# 178. Arquivos principais alterados nesta etapa

## Backend

```text
backend/src/prisma/contract.prisma
backend/src/prisma/contract.json
backend/src/prisma/contract.d.ts
backend/src/services/agendamento.service.ts
backend/src/controllers/agendamento.controller.ts
backend/src/routes/agendamento.routes.ts
```

## Frontend

```text
frontend/src/pages/medico/Agenda.tsx
frontend/src/styles/agenda.css
frontend/src/pages/paciente/MeusAgendamentos.tsx
frontend/src/styles/meusAgendamentos.css
frontend/src/pages/paciente/AgendarConsulta.tsx
frontend/src/styles/agendarConsulta.css
```

Também foi revisada a configuração TypeScript relacionada a:

```text
tsconfig.app.json
```

sem necessidade de remover `erasableSyntaxOnly`.

---

# 179. Estado funcional consolidado após esta implementação

Neste ponto o sistema já possui:

```text
AUTENTICAÇÃO
- JWT
- perfis
- primeiro acesso
- redefinição de senha

ADMIN
- cadastro de médicos
- gestão de médicos

MÉDICO
- cadastro de pacientes
- edição de pacientes
- ativação/bloqueio
- liberação de acesso
- agenda mensal
- criação de disponibilidade
- prevenção de conflitos
- remoção de disponibilidade
- visualização de solicitações
- confirmação de consulta
- recusa de consulta
- remarcação
- desmarcação

PACIENTE
- login
- calendário de horários disponíveis
- seleção de data
- seleção de slot
- envio de solicitação
- status PENDENTE
- próxima consulta abaixo do calendário
- página Meus agendamentos
- acompanhamento de confirmação/recusa/cancelamento

INTERFACE
- desktop
- tablet
- celular
- tema claro
- tema escuro
- modais
- badges de status
- responsividade
```

---

# 180. Fluxo técnico consolidado atual

```text
┌────────────────────────────────────────────┐
│                  USUÁRIO                   │
│       ADMIN | MEDICO | PACIENTE            │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│               FRONTEND REACT               │
│                                            │
│ Login                                      │
│ Área administrativa                        │
│ Área médica                                │
│ Área do paciente                           │
│ Pacientes                                  │
│ Agenda                                     │
│ Agendar consulta                           │
│ Meus agendamentos                          │
│ Próxima consulta                           │
│ Tema claro/escuro                          │
└─────────────────────┬──────────────────────┘
                      │ HTTP + JSON + JWT
                      ▼
┌────────────────────────────────────────────┐
│              BACKEND EXPRESS               │
│                                            │
│ Routes                                     │
│    ↓                                       │
│ Middlewares                                │
│    ↓                                       │
│ Controllers                                │
│    ↓                                       │
│ Services                                   │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│           PRISMA CONTRACT ORM              │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│                POSTGRESQL                  │
│                                            │
│ Usuario                                    │
│ Medico                                     │
│ Paciente                                   │
│ CodigoRedefinicaoSenha                     │
│ DisponibilidadeAgenda                      │
│ Agendamento                                │
│ Prontuario (futuro)                        │
└────────────────────────────────────────────┘
```

---

# 181. Fluxo de agendamento consolidado atual

```text
MÉDICO
  ↓
cria disponibilidade
  ↓
PERÍODO
  ↓
backend gera slots
  ↓
PACIENTE
  ↓
escolhe data
  ↓
escolhe horário
  ↓
backend revalida
  ↓
PENDENTE
  ↓
slot reservado
  ↓
MÉDICO
  ↓
┌─────────────┬─────────────┐
↓             ↓             ↓
CONFIRMAR     RECUSAR       REMARCAR
↓             ↓             ↓
CONFIRMADA    RECUSADA      outro slot
↓             ↓
slot ocupado  slot liberado
↓
┌───────────────┬───────────────┐
↓               ↓
REMARCAR        DESMARCAR
↓               ↓
outro slot      CANCELADA
                ↓
                slot liberado
```

---

# 182. Testes recomendados para o fluxo atual

## Solicitação pelo paciente

```text
1. médico cria disponibilidade;
2. paciente abre calendário;
3. dia aparece disponível;
4. paciente seleciona slot;
5. confirma solicitação;
6. banco grava PENDENTE;
7. slot desaparece da lista livre;
8. card de próxima consulta aparece.
```

## Confirmação pelo médico

```text
1. abrir Horários marcados;
2. localizar PENDENTE;
3. clicar Confirmar;
4. confirmar modal;
5. status muda para CONFIRMADA;
6. paciente passa a visualizar Confirmada.
```

## Recusa

```text
1. localizar PENDENTE;
2. clicar Recusar;
3. confirmar modal;
4. status muda para RECUSADA;
5. slot volta para horários disponíveis;
6. consulta deixa de ser candidata a Próxima consulta.
```

## Remarcação

```text
1. selecionar PENDENTE ou CONFIRMADA;
2. clicar Remarcar;
3. escolher nova data;
4. selecionar slot livre;
5. confirmar;
6. backend revalida;
7. horário antigo é liberado;
8. novo horário fica ocupado;
9. paciente visualiza nova data/hora.
```

## Desmarcação

```text
1. selecionar CONFIRMADA;
2. clicar Desmarcar;
3. confirmar modal;
4. status passa para CANCELADA;
5. horário volta a ficar disponível;
6. consulta deixa de aparecer como próxima consulta.
```

---

# 183. Próximas etapas recomendadas a partir do estado atual

O fluxo de solicitação e decisão médica já está funcional. As próximas etapas devem ser tratadas separadamente para evitar regressões.

Ordem recomendada:

```text
1. testes completos do fluxo atual;
2. proteção definitiva contra concorrência de slots;
3. revisar e migrar registros AGENDADA legados;
4. implementar REALIZADA;
5. implementar FALTOU;
6. preparar conceito de atendimento/consulta;
7. implementar prontuário eletrônico;
8. histórico clínico;
9. reforços finais de segurança;
10. testes finais do TCC.
```

A otimização do calendário mensal também continua válida:

```text
GET /agendamentos/disponibilidade-mensal
```

para evitar uma requisição individual por dia do mês.

---

# 184. Ponto exato de continuidade atualizado

Não é necessário refazer:

```text
contrato de Agendamento
PENDENTE
RECUSADA
migração da restrição de status
criação de slots
reserva de slot
horários disponíveis
AgendarConsulta
MeusAgendamentos
próxima consulta
Horários marcados
confirmar
recusar
remarcar
desmarcar
Agenda.tsx
agenda.css
meusAgendamentos.css
responsividade
tema claro/escuro
```

O próximo avanço funcional deve começar a partir do estado atual, preservando esse ciclo já validado.

Antes de prontuário, é recomendável concluir o ciclo operacional da consulta com:

```text
CONFIRMADA
    ↓
REALIZADA
ou
FALTOU
```

Depois disso:

```text
REALIZADA
    ↓
ATENDIMENTO
    ↓
PRONTUÁRIO
    ↓
HISTÓRICO
```

---

# 185. Conclusão da etapa de confirmação e remarcação

A aplicação deixou de tratar o agendamento como uma reserva automaticamente aceita e passou a representar melhor o processo real de um consultório.

O sistema agora separa claramente:

```text
solicitação do paciente
        ↓
decisão do médico
        ↓
consulta confirmada ou recusada
        ↓
possibilidade de remarcação/desmarcação
```

Também foi melhorada a comunicação visual com o paciente e com o médico.

O paciente consegue:

```text
solicitar
acompanhar o status
ver a próxima consulta abaixo do calendário
consultar todos os agendamentos em página própria
```

O médico consegue:

```text
visualizar solicitações
confirmar
recusar
remarcar
desmarcar
```

O backend continua sendo responsável pela autorização, propriedade do registro, validação dos horários e transições de estado.

A base necessária para avançar posteriormente para `REALIZADA`, `FALTOU`, atendimento e prontuário eletrônico está consolidada.

---

# 186. Atualização incremental — remarcação solicitada pelo paciente

Após a consolidação do fluxo em que o médico pode confirmar, recusar, remarcar e desmarcar consultas, foi iniciada uma nova evolução: permitir que o próprio paciente solicite a remarcação de uma consulta já confirmada.

A regra definida foi diferente da remarcação realizada diretamente pelo médico.

Quando o médico remarca uma consulta, ele possui permissão para alterar diretamente o agendamento depois de escolher um novo slot válido.

Quando o paciente solicita uma remarcação, a consulta original não deve ser alterada imediatamente.

O novo fluxo é:

```text
Consulta CONFIRMADA
        ↓
Paciente solicita remarcação
        ↓
Escolhe nova data e horário disponível
        ↓
Solicitação de remarcação PENDENTE
        ↓
Consulta original continua válida
        ↓
Médico recebe a solicitação
        ↓
ACEITAR → nova data/hora vira oficial
RECUSAR → consulta original permanece
```

---

# 187. Separação entre status do agendamento e status da remarcação

Uma decisão importante foi não utilizar o próprio `StatusAgendamento` para representar a solicitação de remarcação.

Enquanto o médico ainda não decidiu, o estado correto é:

```text
Agendamento.status = CONFIRMADA
RemarcacaoAgendamento.status = PENDENTE
```

Isso representa corretamente a regra de negócio: a consulta original continua confirmada enquanto somente a mudança de data e horário está aguardando aprovação.

---

# 188. StatusRemarcacao e RemarcacaoAgendamento

Foi criada uma estrutura específica para o ciclo da remarcação:

```prisma
enum StatusRemarcacao {
  PENDENTE
  ACEITA
  RECUSADA
}
```

O modelo `RemarcacaoAgendamento` armazena, entre outros dados:

```text
id
agendamentoId
novaData
novaHoraInicio
novaHoraFim
status
visualizadoPaciente
createdAt
updatedAt
```

O objetivo é registrar o novo horário pretendido sem sobrescrever imediatamente a consulta oficial.

O campo `visualizadoPaciente`, inicialmente `false`, também prepara o sistema para controlar posteriormente se o paciente já visualizou a decisão do médico.

---

# 189. Solicitação de remarcação pelo paciente

Foi criado o endpoint:

```text
POST /agendamentos/:id/remarcacoes
```

Body:

```json
{
  "data": "2026-09-20",
  "horaInicio": "10:00"
}
```

O frontend não define livremente `horaFim`, `medicoId`, `pacienteId` ou o status final. Esses valores são obtidos ou validados pelo backend.

Antes de criar a solicitação, o backend verifica:

```text
1. autenticação e perfil PACIENTE;
2. existência do paciente;
3. propriedade do agendamento;
4. status que permite remarcação;
5. nova data/horário diferentes do atual;
6. inexistência de outra remarcação PENDENTE;
7. existência do novo slot na agenda do médico;
8. disponibilidade real do novo horário.
```

---

# 190. Proteção contra múltiplas remarcações pendentes

O mesmo agendamento não pode possuir várias solicitações pendentes simultaneamente.

```text
Agendamento
        ↓
Existe remarcação PENDENTE?
        ↓
Sim → bloqueia nova solicitação
Não → permite continuar
```

Essa regra existe no backend e também foi refletida no frontend.

---

# 191. Reserva do novo slot solicitado

Enquanto a remarcação estiver `PENDENTE`, o novo horário solicitado precisa ser considerado ocupado temporariamente.

Sem essa regra poderia ocorrer:

```text
Paciente solicita 10:00
        ↓
remarcação PENDENTE
        ↓
10:00 continua livre
        ↓
outro paciente agenda 10:00
```

Por isso, a geração de horários disponíveis deve considerar tanto agendamentos ativos quanto remarcações pendentes.

A consulta original também continua válida enquanto o médico não decidir.

---

# 192. Aceite e recusa da remarcação pelo médico

Foram implementadas ações específicas do médico:

```text
PATCH /agendamentos/remarcacoes/:id/aceitar
PATCH /agendamentos/remarcacoes/:id/recusar
```

Ao aceitar:

```text
1. médico é identificado pelo JWT;
2. propriedade do agendamento é validada;
3. remarcação precisa estar PENDENTE;
4. novo slot é revalidado;
5. Agendamento recebe novaData/novaHoraInicio/novaHoraFim;
6. consulta permanece CONFIRMADA;
7. remarcação passa para ACEITA.
```

Ao recusar:

```text
Remarcação → RECUSADA
Agendamento original → permanece inalterado
Novo slot solicitado → volta a ficar disponível
```

---

# 193. Endpoints de remarcação consolidados

## Paciente

```text
GET   /agendamentos/horarios-disponiveis
POST  /agendamentos
GET   /agendamentos/meus
PATCH /agendamentos/:id/cancelar-paciente
POST  /agendamentos/:id/remarcacoes
GET   /agendamentos/remarcacoes/minhas
PATCH /agendamentos/remarcacoes/:id/visualizar
```

## Médico

```text
GET   /agendamentos/medico
POST  /agendamentos/medico
PATCH /agendamentos/:id/confirmar
PATCH /agendamentos/:id/recusar
PATCH /agendamentos/:id/cancelar
PATCH /agendamentos/:id/remarcar
DELETE /agendamentos/:id
GET   /agendamentos/remarcacoes/pendentes
PATCH /agendamentos/remarcacoes/:id/aceitar
PATCH /agendamentos/remarcacoes/:id/recusar
```

As rotas continuam protegidas por autenticação e autorização de perfil.

---

# 194. Listagem das remarcações do paciente

Foi utilizado:

```text
GET /agendamentos/remarcacoes/minhas
```

A resposta permite ao frontend relacionar cada solicitação ao respectivo agendamento e pode incluir:

```text
id
agendamentoId
novaData
novaHoraInicio
novaHoraFim
status
visualizadoPaciente
createdAt
updatedAt
dataAtual
horaInicioAtual
horaFimAtual
statusAgendamento
```

Isso permite comparar a consulta atual com a nova data solicitada sem depender de várias requisições adicionais.

---

# 195. Evolução de MeusAgendamentos.tsx

A página `frontend/src/pages/paciente/MeusAgendamentos.tsx` passou a carregar tanto os agendamentos quanto as remarcações.

A atualização conjunta segue a ideia:

```ts
async function atualizarDados() {
  await Promise.all([
    buscarAgendamentos(),
    buscarRemarcacoes()
  ]);
}
```

Para cada consulta, o frontend procura uma remarcação pendente correspondente:

```ts
function buscarRemarcacaoPendente(
  agendamentoId: number
) {
  return remarcacoes.find(
    (remarcacao) =>
      Number(remarcacao.agendamentoId) ===
        Number(agendamentoId) &&
      remarcacao.status === "PENDENTE"
  );
}
```

---

# 196. Correção do status visual durante a remarcação

Foi identificado que, depois de solicitar uma remarcação, o card ainda mostrava `Confirmada`.

Isso acontecia porque o status oficial do agendamento realmente continuava `CONFIRMADA`, que é a regra correta do banco.

A correção foi feita somente na apresentação.

Quando existe `remarcacaoPendente`, o badge principal passa a mostrar:

```text
Aguardando confirmação da remarcação
```

Quando não existe remarcação pendente, ele continua exibindo normalmente o `StatusAgendamento`.

Essa solução evita alterar incorretamente o domínio apenas para produzir um estado visual.

---

# 197. Descrição especial do card pendente

Durante a remarcação pendente, a descrição do card também muda para algo equivalente a:

```text
Sua solicitação de remarcação foi enviada e aguarda a confirmação do médico.
```

Além disso, foi criado um bloco interno mostrando:

```text
Remarcação aguardando confirmação
Aguardando resposta do médico

Nova data solicitada
DD/MM/AAAA

Novo horário
HH:mm — HH:mm

Sua consulta atual continua válida
até o médico confirmar a remarcação.
```

---

# 198. Bloqueio visual de nova remarcação

Enquanto existe uma remarcação `PENDENTE`, o botão deixa de mostrar:

```text
Remarcar
```

e passa a mostrar:

```text
Remarcação pendente
```

O botão também fica desabilitado.

A função que abre o fluxo de remarcação possui uma segunda verificação, de forma que a proteção não dependa somente do estado visual do botão.

---

# 199. Fluxo visual de remarcação do paciente

```text
Paciente clica Remarcar
        ↓
Calendário de remarcação abre
        ↓
Paciente escolhe nova data
        ↓
Sistema busca horários disponíveis
        ↓
Paciente seleciona slot
        ↓
Modal de confirmação
        ↓
POST /agendamentos/:id/remarcacoes
        ↓
Remarcação PENDENTE
        ↓
MeusAgendamentos recarrega
        ↓
Card mostra "Aguardando confirmação da remarcação"
```

Se o backend responder `409 Conflict`, os horários do dia são recarregados e o paciente pode escolher outro slot.

---

# 200. Comportamento após decisão do médico

## Médico aceita

```text
Remarcação → ACEITA
Agendamento → recebe nova data/hora
Agendamento → CONFIRMADA
```

Como não existe mais uma remarcação `PENDENTE`, o card volta automaticamente para:

```text
Confirmada
```

agora exibindo a nova data e horário oficiais.

## Médico recusa

```text
Remarcação → RECUSADA
Agendamento → permanece original e CONFIRMADA
```

O card também volta para `Confirmada`, preservando a data e horário originais.

---

# 201. Correção da classe visual Confirmada

Durante os ajustes foi identificado um erro de digitação em uma classe relacionada ao estado confirmado.

O nome correto é:

```text
meus-agendamentos-status-confirmada
```

A correção preservou os estilos que já estavam funcionando para `Confirmada` e `Cancelada`.

---

# 202. CSS do card de remarcação pendente

O arquivo:

```text
frontend/src/styles/meusAgendamentos.css
```

foi ampliado para estilizar o estado de remarcação.

Foram utilizadas classes específicas como:

```text
meus-agendamentos-remarcacao-pendente
meus-agendamentos-remarcacao-pendente-topo
meus-agendamentos-remarcacao-pendente-icone
meus-agendamentos-remarcacao-pendente-dados
meus-agendamentos-remarcacao-pendente-aviso
meus-agendamentos-btn-remarcacao-pendente
```

O bloco possui cabeçalho, nova data, novo horário e aviso de que a consulta atual continua válida.

A estilização foi ajustada para ficar integrada ao restante dos cards e também deve respeitar tema escuro e responsividade.

---

# 203. Cancelamento pelo paciente com remarcação pendente

O paciente possui a rota:

```text
PATCH /agendamentos/:id/cancelar-paciente
```

Se a consulta cancelada possuir uma remarcação pendente, essa solicitação também precisa deixar de reservar o novo slot.

Na estrutura atual, `StatusRemarcacao` ainda possui apenas:

```text
PENDENTE
ACEITA
RECUSADA
```

Portanto, uma solicitação pendente encerrada pelo cancelamento da consulta pode ser tratada como `RECUSADA` na lógica atual. Futuramente pode ser avaliada a inclusão de `CANCELADA` no enum de remarcação para diferenciar semanticamente esse cenário.

---

# 204. Regra consolidada do card do paciente

```text
Existe RemarcacaoAgendamento PENDENTE?
        ↓
┌─────────────────────────┬─────────────────────────┐
Sim                       Não
↓                         ↓
Aguardando confirmação    exibe status oficial
 da remarcação
↓                         ↓
mostra nova data/horário  fluxo normal do card
↓
bloqueia nova remarcação
```

O estado visual é derivado da combinação de duas entidades:

```text
Agendamento
+
RemarcacaoAgendamento
```

O banco não é alterado apenas para controlar aparência.

---

# 205. Testes obrigatórios da remarcação pelo paciente

## Criar solicitação

```text
consulta CONFIRMADA
→ paciente solicita novo slot
→ cria RemarcacaoAgendamento PENDENTE
→ consulta original continua CONFIRMADA
→ card mostra aguardando confirmação da remarcação
```

## Bloquear segunda solicitação

```text
existe remarcação PENDENTE
→ botão mostra Remarcação pendente
→ botão fica desabilitado
→ backend também rejeita nova solicitação
```

## Aceitar

```text
médico aceita
→ nova data/hora vira oficial
→ remarcação ACEITA
→ paciente volta a ver Confirmada
→ card mostra novo horário
```

## Recusar

```text
médico recusa
→ remarcação RECUSADA
→ consulta original permanece
→ paciente volta a ver Confirmada
→ novo slot é liberado
```

## Concorrência

```text
paciente visualiza slot
→ slot é ocupado antes da confirmação
→ backend responde conflito
→ frontend recarrega horários
→ paciente escolhe outro slot
```

---

# 206. Arquivos envolvidos nesta atualização

## Backend

```text
backend/src/prisma/contract.prisma
backend/src/prisma/contract.json
backend/src/prisma/contract.d.ts
backend/src/services/agendamento.service.ts
backend/src/controllers/agendamento.controller.ts
backend/src/routes/agendamento.routes.ts
```

## Frontend

```text
frontend/src/pages/paciente/MeusAgendamentos.tsx
frontend/src/styles/meusAgendamentos.css
```

Também foi reutilizada a lógica existente de horários disponíveis para selecionar a nova data e o novo slot.

---

# 207. Estado consolidado após a remarcação do paciente

Neste ponto existem dois fluxos distintos.

## Remarcação pelo médico

```text
Médico escolhe novo slot
        ↓
backend revalida
        ↓
agendamento é alterado diretamente
```

## Remarcação pelo paciente

```text
Paciente escolhe novo slot
        ↓
backend revalida
        ↓
cria solicitação PENDENTE
        ↓
consulta original permanece
        ↓
médico aceita ou recusa
```

Essa distinção respeita os níveis de permissão de cada perfil.

---

# 208. Próximas etapas recomendadas

Depois de validar completamente o fluxo de remarcação, a sequência recomendada permanece:

```text
1. testar aceite e recusa da remarcação;
2. testar reserva e liberação dos slots;
3. testar cancelamento com remarcação pendente;
4. reforçar proteção contra concorrência;
5. revisar registros AGENDADA legados;
6. implementar REALIZADA;
7. implementar FALTOU;
8. iniciar atendimento;
9. implementar prontuário eletrônico;
10. implementar histórico clínico.
```

---

# 209. Ponto exato de continuidade em 15/09/2026

Não é necessário refazer:

```text
PENDENTE do agendamento inicial
CONFIRMADA
RECUSADA
CANCELADA
remarcação direta pelo médico
solicitação de remarcação pelo paciente
StatusRemarcacao
RemarcacaoAgendamento
listagem das remarcações
aceite pelo médico
recusa pelo médico
bloqueio de segunda solicitação
reserva do novo slot
MeusAgendamentos com remarcação
badge Aguardando confirmação da remarcação
card de nova data e novo horário
CSS do card pendente
tema escuro
responsividade
```

O desenvolvimento deve continuar a partir desse estado, preservando tudo que já foi validado.

---

# 210. Conclusão da atualização de remarcação do paciente

O sistema passou a representar um fluxo mais completo de alteração de consultas.

A regra consolidada é:

```text
Consulta confirmada
        ↓
Paciente solicita mudança
        ↓
Remarcação pendente
        ↓
Consulta original continua válida
        ↓
Médico decide
        ↓
ACEITA → novo horário vira oficial
RECUSADA → horário original continua oficial
```

A interface do paciente foi adaptada para comunicar corretamente esse estado intermediário.

Enquanto a solicitação estiver pendente, o card mostra:

```text
Aguardando confirmação da remarcação
```

sem modificar incorretamente o status oficial `CONFIRMADA` do agendamento.

Com isso, a arquitetura mantém separação clara entre:

```text
estado da consulta
```

e:

```text
estado da solicitação de alteração
```

mantendo o backend responsável por autorização, propriedade dos registros, disponibilidade dos slots e decisão final sobre a alteração da consulta.
