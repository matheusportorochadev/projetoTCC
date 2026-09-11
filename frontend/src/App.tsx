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
// PÁGINAS GERAIS
// ========================================

import Login from "./pages/Login";

import Admin from "./pages/Admin";

import CadastrarMedico from "./pages/CadastrarMedico";

import DetalheMedico from "./pages/DetalheMedico";

import EsqueciSenha from "./pages/EsqueciSenha";

import RedefinirSenha from "./pages/RedefinirSenha";


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
            ESQUECI MINHA SENHA
        ======================================== */}

        <Route
          path="/esqueci-senha"
          element={
            <EsqueciSenha />
          }
        />


        {/* ========================================
            REDEFINIR SENHA / PRIMEIRO ACESSO
        ======================================== */}

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
            <Admin />
          }
        />


        <Route
          path="/admin/medicos/cadastrar"
          element={
            <CadastrarMedico />
          }
        />


        <Route
          path="/admin/medicos/:id"
          element={
            <DetalheMedico />
          }
        />


        {/* ========================================
            ÁREA DO MÉDICO
        ======================================== */}

        <Route
          path="/medico"
          element={
            <MedicoLayout />
          }
        >

          {/* Redireciona /medico para pacientes */}
          <Route
            index
            element={
              <Navigate
                to="pacientes"
                replace
              />
            }
          />


          {/* PACIENTES */}
          <Route
            path="pacientes"
            element={
              <Pacientes />
            }
          />


          {/* NOVO PACIENTE */}
          <Route
            path="pacientes/novo"
            element={
              <NovoPaciente />
            }
          />


          {/* AGENDA */}
          <Route
            path="agenda"
            element={
              <Agenda />
            }
          />


          {/* PRONTUÁRIOS */}
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
            <PacienteLayout />
          }
        >

          {/* PÁGINA INICIAL */}
          <Route
            index
            element={
              <InicioPaciente />
            }
          />


          {/* AGENDAR CONSULTA */}
          <Route
            path="agendar"
            element={
              <AgendarConsulta />
            }
          />


          {/* MEUS AGENDAMENTOS */}
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

        <Route
          path="/"
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