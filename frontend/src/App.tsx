// Configuração das rotas da aplicação
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import Login from "./pages/Login";
import Admin from "./pages/Admin";
import CadastrarMedico from "./pages/CadastrarMedico";
import DetalheMedico from "./pages/DetalheMedico";
import EsqueciSenha from "./pages/EsqueciSenha";
import RedefinirSenha from "./pages/RedefinirSenha";

import MedicoLayout from "./layouts/MedicoLayout";
import Pacientes from "./pages/medico/Pacientes";
import Agenda from "./pages/medico/Agenda";
import Prontuarios from "./pages/medico/Prontuarios";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/esqueci-senha"
          element={<EsqueciSenha />}
        />

        <Route
          path="/redefinir-senha"
          element={<RedefinirSenha />}
        />

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/admin/medicos/cadastrar"
          element={<CadastrarMedico />}
        />

        <Route
          path="/admin/medicos/:id"
          element={<DetalheMedico />}
        />

        <Route
          path="/medico"
          element={<MedicoLayout />}
        >
          <Route
            index
            element={
              <Navigate
                to="pacientes"
                replace
              />
            }
          />

          <Route
            path="pacientes"
            element={<Pacientes />}
          />

          <Route
            path="agenda"
            element={<Agenda />}
          />

          <Route
            path="prontuarios"
            element={<Prontuarios />}
          />
        </Route>

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