import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/pacientes.css";

// Formata o CPF durante a digitação
function formatarCpf(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Formata o telefone durante a digitação
function formatarTelefone(valor: string) {
  const numeros = valor
    .replace(/\D/g, "")
    .slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numeros
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function NovoPaciente() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function cadastrarPaciente(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setErro("");
      setSalvando(true);

      if (nome.trim().length < 3) {
        throw new Error(
          "Informe o nome completo do paciente."
        );
      }

      const cpfNumeros = cpf.replace(/\D/g, "");
      const telefoneNumeros =
        telefone.replace(/\D/g, "");

      if (
        cpfNumeros &&
        cpfNumeros.length !== 11
      ) {
        throw new Error(
          "Informe um CPF com 11 dígitos."
        );
      }

      if (
        telefoneNumeros &&
        telefoneNumeros.length < 10
      ) {
        throw new Error(
          "Informe um telefone válido."
        );
      }


      const resposta = await fetch(
        "http://localhost:3000/pacientes",
        {
          method: "POST",

          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            nome: nome.trim(),
            email:
              email.trim() || undefined,
            telefone:
              telefoneNumeros || undefined,
            cpf:
              cpfNumeros || undefined
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.mensagem ||
            "Erro ao cadastrar paciente."
        );
      }

      navigate("/medico/pacientes");
    } catch (erro) {
      setErro(
        erro instanceof Error
          ? erro.message
          : "Erro ao cadastrar paciente."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pacientes-pagina">
      <div className="novo-paciente-conteudo">
        <div className="novo-paciente-cabecalho">
          <h1>Novo paciente</h1>

          <p>
            Preencha os dados para cadastrar
            um novo paciente.
          </p>
        </div>

        <form
          className="paciente-formulario"
          onSubmit={cadastrarPaciente}
        >
          {erro && (
            <div className="pacientes-erro">
              {erro}
            </div>
          )}

          <div className="formulario-campo">
            <label htmlFor="nome">
              Nome *
            </label>

            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(event.target.value)
              }
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="formulario-linha">
            <div className="formulario-campo">
              <label htmlFor="cpf">
                CPF
              </label>

              <input
                id="cpf"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={(event) =>
                  setCpf(
                    formatarCpf(
                      event.target.value
                    )
                  )
                }
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div className="formulario-campo">
              <label htmlFor="telefone">
                Celular
              </label>

              <input
                id="telefone"
                type="text"
                inputMode="numeric"
                value={telefone}
                onChange={(event) =>
                  setTelefone(
                    formatarTelefone(
                      event.target.value
                    )
                  )
                }
                placeholder="(34) 99999-9999"
                maxLength={15}
              />
            </div>
          </div>

          <div className="formulario-campo">
            <label htmlFor="email">
              E-mail
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="paciente@email.com"
            />
          </div>

          <div className="formulario-acoes">
            <button
              type="button"
              className="botao-cancelar"
              onClick={() =>
                navigate(
                  "/medico/pacientes"
                )
              }
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="botao-salvar"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : "Cadastrar paciente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}