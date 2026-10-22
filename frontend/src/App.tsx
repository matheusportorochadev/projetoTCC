
 // ========================================
 // IMPORTAÇÕES DO REACT ROUTER
 // ========================================

 import {
   BrowserRouter,
   Routes,
   Route,
   Navigate
 } from "react-router-dom";

 // ========================================
 // PROTEÇÃO DAS ROTAS
 // ========================================

 import RotaProtegida from "./components/RotaProtegida";

 // ========================================
 // PÁGINAS GERAIS
 // ========================================

 import Login from "./pages/Login";

 import Admin from "./pages/Admin";

 import CadastrarMedico from "./pages/CadastrarMedico";

 import DetalheMedico from "./pages/DetalheMedico";

 import EsqueciSenha from "./pages/EsqueciSenha";

 import RedefinirSenha from "./pages/RedefinirSenha";

 import PrimeiroAcesso from "./pages/PrimeiroAcesso";

 // ========================================
 // ÁREA DO MÉDICO
 // ========================================

 import MedicoLayout from "./layouts/MedicoLayout";

 import Pacientes from "./pages/medico/Pacientes";

 import NovoPaciente from "./pages/medico/NovoPaciente";

 // NOVO:
 // Página responsável por editar um
 // paciente já cadastrado.
 import EditarPaciente from "./pages/medico/EditarPaciente";

 import Agenda from "./pages/medico/Agenda";

 import Prontuarios from "./pages/medico/Prontuarios";

 // ========================================
 // ÁREA DO PACIENTE
 // ========================================

 import PacienteLayout from "./layouts/PacienteLayout";

 import InicioPaciente from "./pages/paciente/InicioPaciente";

 import AgendarConsulta from "./pages/paciente/AgendarConsulta";

 import MeusAgendamentos from "./pages/paciente/MeusAgendamentos";

 // ========================================
 // ESTILOS GLOBAIS
 // ========================================

 import "./styles/tema.css";

 // ========================================
 // COMPONENTE PRINCIPAL
 // ========================================

 function App() {

   return (

     <BrowserRouter>

       <Routes>

         {/* ========================================
             LOGIN
         ======================================== */}

         <Route
           path="/login"
           element={
             <Login />
           }
         />

         {/* ========================================
             PRIMEIRO ACESSO
         ======================================== */}

         {/*
           Rota destinada aos usuários
           que ainda precisam cadastrar
           sua primeira senha.

           Fluxo:

           Login
             ↓
           Primeiro acesso
             ↓
           Solicitação de código
             ↓
           Validação do código
             ↓
           Cadastro da senha
             ↓
           Login
         */}

         <Route
           path="/primeiro-acesso"
           element={
             <PrimeiroAcesso />
           }
         />

         {/* ========================================
             ESQUECI MINHA SENHA
         ======================================== */}

         {/*
           Permite solicitar o código
           para redefinir uma senha
           já cadastrada.
         */}

         <Route
           path="/esqueci-senha"
           element={
             <EsqueciSenha />
           }
         />

         {/* ========================================
             REDEFINIR SENHA
         ======================================== */}

         {/*
           Página utilizada após
           solicitar a recuperação.
         */}

         <Route
           path="/redefinir-senha"
           element={
             <RedefinirSenha />
           }
         />

         {/* ========================================
             ÁREA ADMINISTRATIVA
         ======================================== */}

         {/*
           Todas as rotas administrativas
           exigem um usuário autenticado
           com perfil ADMIN.
         */}

         <Route
           path="/admin"
           element={
             <RotaProtegida
               tipoPermitido="ADMIN"
             >
               <Admin />
             </RotaProtegida>
           }
         />

         {/* ========================================
             CADASTRAR MÉDICO
         ======================================== */}

         <Route
           path="/admin/medicos/cadastrar"
           element={
             <RotaProtegida
               tipoPermitido="ADMIN"
             >
               <CadastrarMedico />
             </RotaProtegida>
           }
         />

         {/* ========================================
             DETALHES DO MÉDICO
         ======================================== */}

         <Route
           path="/admin/medicos/:id"
           element={
             <RotaProtegida
               tipoPermitido="ADMIN"
             >
               <DetalheMedico />
             </RotaProtegida>
           }
         />

         {/* ========================================
             ÁREA DO MÉDICO
         ======================================== */}

         {/*
           Todas as páginas abaixo utilizam
           a mesma proteção MEDICO.

           O MedicoLayout mantém:

           - barra de navegação;
           - menu de pacientes;
           - agenda;
           - prontuários;
           - botão de sair;
           - tema do sistema.

           O conteúdo das páginas
           aparece dentro do Outlet.
         */}

         <Route
           path="/medico"
           element={
             <RotaProtegida
               tipoPermitido="MEDICO"
             >
               <MedicoLayout />
             </RotaProtegida>
           }
         >

           {/* ========================================
               ROTA PADRÃO DO MÉDICO
           ======================================== */}

           {/*
             Quando o médico acessa:

             /medico

             é redirecionado para:

             /medico/pacientes
           */}

           <Route
             index
             element={
               <Navigate
                 to="pacientes"
                 replace
               />
             }
           />

           {/* ========================================
               LISTAR PACIENTES
           ======================================== */}

           {/*
             Permite ao médico:

             - listar pacientes;
             - pesquisar;
             - abrir detalhes;
             - liberar ou bloquear acesso;
             - alterar status;
             - acessar a edição.
           */}

           <Route
             path="pacientes"
             element={
               <Pacientes />
             }
           />

           {/* ========================================
               CADASTRAR NOVO PACIENTE
           ======================================== */}

           <Route
             path="pacientes/novo"
             element={
               <NovoPaciente />
             }
           />

           {/* ========================================
               EDITAR PACIENTE
           ======================================== */}

           {/*
             NOVA ROTA.

             Corrige o problema em que
             o botão "Editar paciente"
             levava o usuário para o login.

             Antes, o botão apontava para:

             /medico/pacientes/15

             Porém, não existia uma rota
             correspondente no App.tsx.

             Agora, o parâmetro :id recebe
             o identificador do paciente.

             Exemplo:

             /medico/pacientes/15

             O componente EditarPaciente:

             1. Obtém o ID pela URL.
             2. Consulta os dados na API.
             3. Preenche o formulário.
             4. Permite alterar os dados.
             5. Envia PATCH /pacientes/:id.
             6. Retorna à lista após salvar.

             A rota permanece protegida
             pelo perfil MEDICO.
           */}

           <Route
             path="pacientes/:id"
             element={
               <EditarPaciente />
             }
           />

           {/* ========================================
               AGENDA DO MÉDICO
           ======================================== */}

           {/*
             Página responsável por:

             - calendário;
             - disponibilidades;
             - consultas;
             - confirmações;
             - recusas;
             - remarcações;
             - cancelamentos.
           */}

           <Route
             path="agenda"
             element={
               <Agenda />
             }
           />

           {/* ========================================
               PRONTUÁRIOS DO MÉDICO
           ======================================== */}

           {/*
             A área de prontuários continua
             separada das consultas.

             As verificações adicionais
             de senha dos prontuários
             permanecem no próprio módulo.
           */}

           <Route
             path="prontuarios"
             element={
               <Prontuarios />
             }
           />

         </Route>

         {/* ========================================
             ÁREA DO PACIENTE
         ======================================== */}

         {/*
           Todas as páginas abaixo exigem
           perfil PACIENTE.

           O PacienteLayout mantém a
           navegação exclusiva do paciente.
         */}

         <Route
           path="/paciente"
           element={
             <RotaProtegida
               tipoPermitido="PACIENTE"
             >
               <PacienteLayout />
             </RotaProtegida>
           }
         >

           {/* ========================================
               INÍCIO DO PACIENTE
           ======================================== */}

           <Route
             index
             element={
               <InicioPaciente />
             }
           />

           {/* ========================================
               AGENDAR CONSULTA
           ======================================== */}

           <Route
             path="agendar"
             element={
               <AgendarConsulta />
             }
           />

           {/* ========================================
               MEUS AGENDAMENTOS
           ======================================== */}

           <Route
             path="agendamentos"
             element={
               <MeusAgendamentos />
             }
           />

         </Route>

         {/* ========================================
             ROTA INICIAL
         ======================================== */}

         {/*
           Ao abrir:

           http://localhost:5173

           o usuário é direcionado
           para a página de login.
         */}

         <Route
           path="/"
           element={
             <Navigate
               to="/login"
               replace
             />
           }
         />

         {/* ========================================
             ROTA NÃO ENCONTRADA
         ======================================== */}

         {/*
           Preserva o comportamento anterior:

           caminhos não cadastrados
           são redirecionados para o login.

           A rota de edição agora está
           cadastrada e não deverá mais
           cair neste redirecionamento.
         */}

         <Route
           path="*"
           element={
             <Navigate
               to="/login"
               replace
             />
           }
         />

       </Routes>

     </BrowserRouter>

   );

 }

 // ========================================
 // EXPORTAÇÃO
 // ========================================

 export default App;
