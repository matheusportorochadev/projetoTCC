# CODE TCC --- Sistema de Controle de Agenda Médica e Prontuários Eletrônicos

## 1. Visão geral do projeto

O projeto consiste no desenvolvimento de um sistema web para
informatização de um consultório médico, com foco em cadastro de
pacientes, agenda médica, prontuários eletrônicos, histórico de
atendimentos e controle de acesso.

**Tema do TCC:** Sistema de Controle e Informatização de Agenda Médica e
Prontuários Eletrônicos em um Consultório Médico.

### Tecnologias definidas

-   Frontend: React + TypeScript + Vite
-   Backend: Node.js + Express + TypeScript
-   Banco de dados: PostgreSQL
-   ORM: Prisma 8 RC / Prisma Next
-   Autenticação: JWT
-   Criptografia de senhas: bcrypt
-   Envio de e-mail: Nodemailer + Brevo SMTP
-   Versionamento: Git/GitHub
-   Ambiente de desenvolvimento: VS Code
-   Sistema utilizado no desenvolvimento: macOS

------------------------------------------------------------------------

## 2. Perfis de acesso

Foram definidos três tipos de usuários:

### ADMIN

O administrador será responsável pela administração geral do sistema.

Principais funções:

-   realizar login;
-   cadastrar médicos;
-   visualizar médicos;
-   consultar detalhes de um médico;
-   ativar médicos;
-   bloquear médicos;
-   excluir médicos;
-   acompanhar futuramente informações administrativas do sistema.

O administrador não deve utilizar o sistema para acessar informações
clínicas dos pacientes.

### MEDICO

O médico terá sua própria área dentro da plataforma.

Principais funções planejadas:

-   realizar login;
-   concluir processo de primeiro acesso;
-   cadastrar pacientes;
-   editar dados dos pacientes;
-   liberar ou bloquear acesso do paciente;
-   visualizar seus pacientes;
-   configurar agenda;
-   definir dias e horários disponíveis;
-   bloquear datas ou horários;
-   acompanhar consultas;
-   criar e editar prontuários;
-   consultar histórico dos pacientes.

### PACIENTE

O paciente terá acesso somente às próprias informações.

Principais funções planejadas:

-   realizar login após liberação pelo médico;
-   visualizar seus dados;
-   visualizar seu histórico;
-   visualizar seus agendamentos;
-   consultar horários disponíveis;
-   agendar consultas;
-   cancelar consultas de acordo com as regras do sistema.

O paciente não poderá visualizar a agenda completa do médico nem
informações de outros pacientes.

------------------------------------------------------------------------

## 3. Estrutura do projeto

Estrutura principal:

``` text
tcc-consultorio/
├── backend/
└── frontend/
```

Diretórios utilizados no desenvolvimento:

``` text
/Users/matheusrocha/Documents/tcc-consultorio
/Users/matheusrocha/Documents/tcc-consultorio/backend
/Users/matheusrocha/Documents/tcc-consultorio/frontend
```

------------------------------------------------------------------------

## 4. Backend

O backend foi desenvolvido utilizando Node.js, Express e TypeScript.

O servidor utiliza:

-   Express;
-   CORS;
-   JSON;
-   JWT;
-   bcrypt;
-   PostgreSQL;
-   Prisma;
-   Nodemailer.

Servidor configurado na porta:

``` text
3000
```

Frontend autorizado pelo CORS:

``` text
http://localhost:5173
```

Scripts principais:

``` json
"dev": "tsx watch src/server.ts",
"start": "tsx src/server.ts",
"typecheck": "tsc --noEmit"
```

------------------------------------------------------------------------

## 5. Banco de dados

Foi criado o banco PostgreSQL:

``` text
tcc_consultorio
```

O PostgreSQL está sendo executado através do Postgres.app.

Versão utilizada durante o desenvolvimento:

``` text
PostgreSQL 18.6
```

As tabelas atuais são:

``` text
usuario
medico
paciente
codigoRedefinicaoSenha
```

------------------------------------------------------------------------

## 6. Prisma

O projeto está utilizando Prisma 8 RC / Prisma Next.

O contrato principal está localizado em:

``` text
backend/src/prisma/contract.prisma
```

O fluxo utilizado para alterações no banco é:

``` bash
npx prisma contract emit
npx prisma db update
npx prisma db verify
```

Não estamos utilizando o fluxo antigo com `prisma db push`.

------------------------------------------------------------------------

## 7. Modelagem atual

### TipoUsuario

``` prisma
enum TipoUsuario {
  ADMIN
  MEDICO
  PACIENTE
}
```

### Usuario

``` prisma
model Usuario {
  id             Int               @id @default(autoincrement())
  nome           String
  email          String            @unique
  senha          String
  tipo           TipoUsuario
  ativo          Boolean           @default(true)
  primeiroAcesso Boolean           @default(true)
  createdAt      TimestamptzString @default(now())
  updatedAt      temporal.updatedAtString()

  medico            Medico?
  paciente           Paciente?
  codigosRedefinicao CodigoRedefinicaoSenha[]
}
```

### Medico

``` prisma
model Medico {
  id        Int    @id @default(autoincrement())
  usuarioId Int    @unique
  crm       String @unique

  usuario   Usuario   @relation(fields: [usuarioId], references: [id])
  pacientes Paciente[]
}
```

### Paciente

``` prisma
model Paciente {
  id             Int      @id @default(autoincrement())
  medicoId       Int
  usuarioId      Int?     @unique
  nome           String
  email          String?
  telefone       String?
  cpf            String?  @unique
  acessoLiberado Boolean  @default(false)
  ativo          Boolean  @default(true)

  medico         Medico   @relation(fields: [medicoId], references: [id])
  usuario        Usuario? @relation(fields: [usuarioId], references: [id])
}
```

### CodigoRedefinicaoSenha

``` prisma
model CodigoRedefinicaoSenha {
  id        Int               @id @default(autoincrement())
  usuarioId Int
  codigo    String
  expiraEm  TimestamptzString
  usado     Boolean           @default(false)
  createdAt TimestamptzString @default(now())

  usuario   Usuario @relation(fields: [usuarioId], references: [id])
}
```

------------------------------------------------------------------------

## 8. Autenticação

Foi implementado login com:

-   e-mail;
-   senha;
-   validação do usuário;
-   verificação de usuário ativo;
-   comparação da senha com bcrypt;
-   geração de token JWT;
-   diferenciação por perfil de acesso.

Rotas existentes:

``` text
POST /auth/login
GET /perfil
GET /admin
```

O token JWT possui atualmente duração de 8 horas.

------------------------------------------------------------------------

## 9. Primeiro acesso do médico

Foi implementado um fluxo especial para o primeiro acesso.

### Funcionamento

``` text
Administrador cadastra o médico
        ↓
Médico recebe uma senha provisória
        ↓
Médico acessa a tela normal de login
        ↓
Sistema valida e-mail + senha provisória
        ↓
Sistema identifica primeiroAcesso = true
        ↓
Código de 6 dígitos é enviado por e-mail
        ↓
Médico informa o código
        ↓
Médico define uma nova senha
        ↓
Senha é criptografada
        ↓
primeiroAcesso = false
        ↓
Próximos logins funcionam normalmente
```

Esse fluxo evita a necessidade de uma tela de login separada para
primeiro acesso.

------------------------------------------------------------------------

## 10. Redefinição de senha

Foi criada a tabela `codigoRedefinicaoSenha`.

Cada código possui:

-   usuário relacionado;
-   código de 6 dígitos;
-   data de expiração;
-   indicador se já foi utilizado;
-   data de criação.

O código atualmente expira em:

``` text
10 minutos
```

Rotas implementadas:

``` text
POST /auth/esqueci-senha
POST /auth/redefinir-senha
```

A nova senha precisa possuir:

-   mínimo de 8 caracteres;
-   pelo menos uma letra maiúscula;
-   pelo menos uma letra minúscula;
-   pelo menos um número;
-   pelo menos um caractere especial.

O código precisa possuir exatamente 6 números.

------------------------------------------------------------------------

## 11. Envio real de e-mail

Foi integrado o Nodemailer com o SMTP da Brevo.

Arquivo responsável:

``` text
backend/src/services/email.service.ts
```

O sistema envia um e-mail contendo o código de redefinição.

Durante os testes ocorreu o erro:

``` text
525 5.7.1 Unauthorized IP address
```

O problema foi resolvido autorizando o endereço IP nas configurações de
segurança da Brevo.

Depois da autorização, o envio real do código para o e-mail foi testado
com sucesso.

------------------------------------------------------------------------

## 12. Administração de médicos

Foi desenvolvido o módulo administrativo de médicos.

Rotas:

``` text
POST   /medicos
GET    /medicos
GET    /medicos/:id
PATCH  /medicos/:id/status
DELETE /medicos/:id
```

Essas operações são restritas ao administrador no backend.

### Cadastro de médico

O cadastro possui:

-   nome;
-   e-mail;
-   CRM;
-   senha inicial.

Validações implementadas:

**Nome** - obrigatório; - mínimo de 3 caracteres; - somente letras e
espaços.

**E-mail** - formato válido; - convertido para letras minúsculas; - não
pode existir anteriormente.

**CRM** - obrigatório; - convertido para letras maiúsculas; - não pode
estar duplicado.

**Senha** - mínimo 8 caracteres; - maiúscula; - minúscula; - número; -
caractere especial.

A senha é armazenada utilizando bcrypt.

------------------------------------------------------------------------

## 13. Ativação e bloqueio do médico

O administrador pode alterar o campo:

``` text
ativo
```

Quando:

``` text
ativo = true
```

o médico pode acessar o sistema.

Quando:

``` text
ativo = false
```

o login é bloqueado.

------------------------------------------------------------------------

## 14. Bug encontrado na exclusão de médicos

Durante os testes foi encontrado um problema importante.

Ao excluir um médico, ele desaparecia da tabela `medico`, porém seu
registro continuava na tabela `usuario`.

Isso fazia com que, ao tentar cadastrar novamente o mesmo e-mail, o
sistema retornasse:

``` text
Já existe um usuário com este e-mail.
```

### Investigação

Foi utilizado o PostgreSQL diretamente:

``` bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql tcc_consultorio
```

A consulta da tabela `usuario` mostrou que o usuário ainda existia.

A tabela `medico` mostrou que o registro específico já havia sido
removido.

Depois foi identificada a tabela:

``` text
codigoRedefinicaoSenha
```

Ela ainda possuía códigos vinculados ao usuário excluído.

### Causa

O relacionamento por chave estrangeira impedia a exclusão do usuário
enquanto existissem códigos de redefinição vinculados a ele.

O processo anterior executava:

``` text
Excluir Medico
     ↓
Excluir Usuario
```

O médico era apagado, mas a exclusão do usuário falhava.

Isso criava um usuário órfão.

### Correção

A ordem correta passou a ser:

``` text
Excluir códigos de redefinição
        ↓
Excluir médico
        ↓
Excluir usuário
```

Os códigos são localizados e removidos antes da exclusão do usuário.

Também foi realizada uma limpeza manual do usuário órfão durante os
testes.

------------------------------------------------------------------------

## 15. Frontend administrativo

O frontend utiliza:

-   React;
-   TypeScript;
-   Vite;
-   React Router.

Foram criadas páginas para:

``` text
Login
Admin
CadastrarMedico
DetalheMedico
EsqueciSenha
RedefinirSenha
```

O painel administrativo possui estrutura para exibir:

-   total de médicos;
-   médicos ativos;
-   total de pacientes;
-   listagem dos médicos.

O total de pacientes será conectado posteriormente ao módulo de
pacientes.

------------------------------------------------------------------------

## 16. Área do médico

Começamos a desenvolver a área utilizada pelo médico após o login.

Foi decidido utilizar uma **navbar superior**, principalmente para
melhorar a experiência em dispositivos móveis.

Estrutura planejada:

``` text
Sistema Médico

Pacientes | Agenda | Prontuários                Médico | Sair
```

Rotas:

``` text
/medico
/medico/pacientes
/medico/agenda
/medico/prontuarios
```

Ao acessar:

``` text
/medico
```

o sistema redireciona automaticamente para:

``` text
/medico/pacientes
```

Portanto, **Pacientes será a página inicial da área do médico**.

------------------------------------------------------------------------

## 17. Layout da área médica

Foi criado:

``` text
frontend/src/layouts/MedicoLayout.tsx
```

O layout utiliza:

``` tsx
<Outlet />
```

do React Router.

Isso permite manter a navbar fixa enquanto somente o conteúdo da página
é alterado.

A estrutura ficou:

``` text
MedicoLayout
│
├── Navbar
│   ├── Pacientes
│   ├── Agenda
│   ├── Prontuários
│   ├── Nome do médico
│   └── Sair
│
└── Outlet
    ├── Pacientes
    ├── Agenda
    └── Prontuários
```

Foi criado também:

``` text
frontend/src/styles/medicoLayout.css
```

com responsividade inicial para dispositivos móveis.

------------------------------------------------------------------------

## 18. Páginas da área médica

Foram criadas:

``` text
frontend/src/pages/medico/Pacientes.tsx
frontend/src/pages/medico/Agenda.tsx
frontend/src/pages/medico/Prontuarios.tsx
```

Por enquanto são páginas iniciais simples.

Elas serão desenvolvidas gradualmente conforme cada módulo for
implementado.

------------------------------------------------------------------------

## 19. Redirecionamento após login

O login foi alterado para verificar o tipo do usuário.

### Administrador

``` text
Login
  ↓
ADMIN
  ↓
/admin
```

### Médico no primeiro acesso

``` text
Login
  ↓
MEDICO + primeiroAcesso = true
  ↓
Envio do código por e-mail
  ↓
/redefinir-senha
```

### Médico após concluir primeiro acesso

``` text
Login
  ↓
MEDICO + primeiroAcesso = false
  ↓
/medico
  ↓
/medico/pacientes
```

------------------------------------------------------------------------

## 20. Erro de tela branca encontrado no frontend

Após a criação das novas rotas, ocorreu uma tela branca.

O console apresentou:

``` text
Uncaught SyntaxError:
The requested module '/src/pages/medico/Agenda.tsx'
does not provide an export named 'default'
```

A causa foi identificada como ausência do:

``` tsx
export default
```

no componente `Agenda`.

O componente foi corrigido para:

``` tsx
export default function Agenda() {
  return (
    <div>
      <h1>Agenda</h1>
      <p>Gerencie seus horários e consultas.</p>
    </div>
  );
}
```

O mesmo padrão foi mantido em Pacientes e Prontuários.

------------------------------------------------------------------------

## 21. Estrutura atual aproximada do frontend

``` text
frontend/src/
├── layouts/
│   └── MedicoLayout.tsx
│
├── pages/
│   ├── Login.tsx
│   ├── Admin.tsx
│   ├── CadastrarMedico.tsx
│   ├── DetalheMedico.tsx
│   ├── EsqueciSenha.tsx
│   ├── RedefinirSenha.tsx
│   │
│   └── medico/
│       ├── Pacientes.tsx
│       ├── Agenda.tsx
│       └── Prontuarios.tsx
│
├── services/
│   └── api.ts
│
├── styles/
│   ├── login.css
│   ├── cadastrarMedico.css
│   └── medicoLayout.css
│
└── App.tsx
```

------------------------------------------------------------------------

## 22. Agenda --- comportamento definido

O módulo ainda será implementado, mas as regras principais já foram
definidas.

O médico poderá:

-   definir dias de atendimento;
-   definir horários;
-   configurar duração das consultas;
-   bloquear datas;
-   bloquear horários específicos;
-   visualizar a agenda completa;
-   identificar os pacientes agendados.

O paciente poderá:

-   visualizar somente horários disponíveis;
-   escolher um horário;
-   realizar o agendamento;
-   visualizar seus próprios agendamentos;
-   cancelar conforme as regras.

O paciente **não poderá saber quem está ocupando um horário
indisponível**.

Status planejados:

``` text
AGENDADA
CONFIRMADA
REALIZADA
CANCELADA
FALTOU
```

------------------------------------------------------------------------

## 23. Pacientes --- comportamento definido

O médico será responsável inicialmente pelo cadastro do paciente.

O cadastro do paciente não significa que ele automaticamente poderá
entrar no sistema.

Foi definido o campo:

``` text
acessoLiberado
```

Fluxo:

``` text
Médico cadastra paciente
        ↓
Paciente existe no sistema
        ↓
Médico decide liberar acesso
        ↓
Sistema cria/libera acesso do paciente
        ↓
Paciente passa a utilizar a plataforma
```

Isso dá ao médico controle sobre quem poderá acessar a área do paciente.

------------------------------------------------------------------------

## 24. Prontuário eletrônico

O prontuário será desenvolvido depois dos módulos de pacientes e agenda.

O médico deverá conseguir:

-   registrar consultas;
-   adicionar informações clínicas;
-   visualizar histórico;
-   acompanhar registros anteriores do paciente.

O paciente poderá futuramente visualizar somente as informações
definidas como apropriadas para sua área.

O administrador não deverá utilizar seu perfil para acessar informações
clínicas.

------------------------------------------------------------------------

## 25. Segurança já implementada

Até o momento:

-   senhas criptografadas com bcrypt;
-   autenticação JWT;
-   diferenciação ADMIN, MEDICO e PACIENTE;
-   bloqueio de usuários;
-   senha forte;
-   primeiro acesso;
-   redefinição por código;
-   código com validade;
-   código marcado como utilizado;
-   envio real por e-mail;
-   rotas administrativas protegidas no backend;
-   `.env` fora do versionamento;
-   `.env.example` sem credenciais reais.

------------------------------------------------------------------------

## 26. Melhorias de segurança para etapas posteriores

Antes da versão final, ainda devem ser considerados:

-   proteção das rotas do frontend;
-   armazenamento mais seguro dos códigos de redefinição;
-   invalidar códigos antigos ao gerar um novo;
-   limitar quantidade de solicitações de código;
-   evitar exposição da existência de determinado e-mail;
-   mover URL da API para variável de ambiente do Vite;
-   revisar tempo de expiração do JWT;
-   tratar exclusões utilizando transações;
-   impedir exclusão física de médicos com registros clínicos;
-   preferir bloqueio/arquivamento quando existirem dados médicos;
-   aplicar regras relacionadas à LGPD.

------------------------------------------------------------------------

## 27. Ordem de desenvolvimento definida

A sequência adotada é:

``` text
1. Estrutura do projeto
2. Banco de dados
3. Login e autenticação
4. Administrador
5. Cadastro e gerenciamento de médicos
6. Primeiro acesso e redefinição de senha
7. Área do médico
8. Pacientes
9. Agenda
10. Prontuários
11. Área do paciente
12. Segurança e refinamentos
13. Testes finais
```

Já avançamos até o início da **Área do Médico**.

------------------------------------------------------------------------

## 28. Próxima etapa

O próximo módulo será **Pacientes**.

A página:

``` text
/medico/pacientes
```

será a página inicial do médico.

Nela deverão ser implementados gradualmente:

-   título e informações principais;
-   botão "Novo paciente";
-   busca de pacientes;
-   listagem dos pacientes do médico;
-   status do paciente;
-   acesso liberado/bloqueado;
-   visualização de detalhes;
-   edição;
-   ativação/bloqueio;
-   futuramente acesso ao prontuário.

Depois de concluir o módulo de pacientes, o desenvolvimento seguirá para
**Agenda** e, por último, **Prontuários**.

------------------------------------------------------------------------

## 29. Estado atual do projeto

Até este ponto já temos uma base funcional contendo:

**Backend** - banco PostgreSQL; - Prisma configurado; - autenticação; -
JWT; - bcrypt; - perfis de usuário; - administrador; - CRUD
administrativo de médicos; - ativação e bloqueio; - primeiro acesso; -
redefinição de senha; - envio real de código por e-mail; - correção da
exclusão relacionada aos códigos de redefinição.

**Frontend** - login; - painel administrativo; - cadastro de médico; -
detalhes do médico; - primeiro acesso; - redefinição de senha; -
redirecionamento por tipo de usuário; - início da área do médico; -
navbar superior; - rotas de Pacientes, Agenda e Prontuários; -
responsividade inicial.

O próximo ponto de continuação é o desenvolvimento funcional de
**Pacientes** dentro da área do médico.
