// ========================================
// CONFIGURAÇÃO DAS ROTAS DA APLICAÇÃO
// ========================================

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";


// ========================================
// PROTEÇÃO DE ROTAS
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
          Esta rota é usada somente para
          usuários que ainda não criaram
          a própria senha.

          Fluxo:

          /login
              ↓
          Primeiro acesso
              ↓
          /primeiro-acesso
              ↓
          informa e-mail
              ↓
          recebe código
              ↓
          cria senha
              ↓
          volta para /login
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
          Esta rota pertence ao fluxo de
          recuperação de senha.

          É diferente do primeiro acesso.

          Aqui o usuário já possui uma senha,
          mas não se lembra dela.
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
          Depois que o usuário solicita
          a recuperação da senha em:

          /esqueci-senha

          ele recebe um código e é enviado
          para esta página.
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


        {/* CADASTRAR MÉDICO */}

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


        {/* DETALHES DO MÉDICO */}

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
            Ao acessar apenas:

            /medico

            o sistema redireciona automaticamente
            para:

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
              PACIENTES
          ======================================== */}

          <Route
            path="pacientes"
            element={
              <Pacientes />
            }
          />


          {/* ========================================
              NOVO PACIENTE
          ======================================== */}

          <Route
            path="pacientes/novo"
            element={
              <NovoPaciente />
            }
          />


          {/* ========================================
              AGENDA
          ======================================== */}

          <Route
            path="agenda"
            element={
              <Agenda />
            }
          />


          {/* ========================================
              PRONTUÁRIOS
          ======================================== */}

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
              PÁGINA INICIAL DO PACIENTE
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
          Ao abrir diretamente:

          http://localhost:5173

          o usuário será enviado
          para a tela de login.
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
          Caso o usuário digite uma rota
          inexistente, volta para o login.

          Isso também evita uma página
          completamente em branco.
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


export default App;