// ========================================
// CAMPO DE SENHA
// ========================================

import {
  useState
} from "react";


// ========================================
// TIPOS
// ========================================

type Props = {

  id: string;

  label: string;

  value: string;

  placeholder: string;


  onChange: (
    valor: string
  ) => void;


  minLength?: number;

  maxLength?: number;

  required?: boolean;

  disabled?: boolean;


  autoComplete?:
    | "current-password"
    | "new-password";


  ajuda?: string;

};


// ========================================
// COMPONENTE
// ========================================

export default function CampoSenha({
  id,
  label,
  value,
  placeholder,
  onChange,
  minLength,
  maxLength,
  required = false,
  disabled = false,
  autoComplete,
  ajuda
}: Props) {

  // ========================================
  // MOSTRAR / OCULTAR SENHA
  // ========================================

  const [
    mostrarSenha,
    setMostrarSenha
  ] =
    useState(false);


  return (

    <div className="form-group">

      <label
        htmlFor={
          id
        }
      >
        {label}
      </label>


      <div className="senha-wrapper">

        <input
          id={
            id
          }
          type={
            mostrarSenha
              ? "text"
              : "password"
          }
          placeholder={
            placeholder
          }
          value={
            value
          }
          onChange={(evento) =>

            onChange(
              evento.target.value
            )

          }
          minLength={
            minLength
          }
          maxLength={
            maxLength
          }
          required={
            required
          }
          disabled={
            disabled
          }
          autoComplete={
            autoComplete
          }
        />


        {/* ========================================
            OLHINHO
        ======================================== */}

        <button
          type="button"
          className="senha-toggle"
          onClick={() =>

            setMostrarSenha(
              (estadoAtual) =>
                !estadoAtual
            )

          }
          aria-label={
            mostrarSenha
              ? "Ocultar senha"
              : "Mostrar senha"
          }
          title={
            mostrarSenha
              ? "Ocultar senha"
              : "Mostrar senha"
          }
          disabled={
            disabled
          }
        >

          {
            mostrarSenha
              ? (

                /*
                  OLHO RISCADO
                */
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >

                  <path
                    d="
                      M3 3
                      l18 18

                      M10.6 10.7
                      a2 2 0 0 0 2.7 2.7

                      M9.9 4.2
                      A10.6 10.6 0 0 1 12 4
                      c5.5 0 9 5 9 5
                      a16.7 16.7 0 0 1 -2.1 2.5

                      M6.6 6.6
                      C4.3 8 3 10 3 10
                      s3.5 5 9 5
                      a10 10 0 0 0 4.1-.9
                    "
                  />

                </svg>

              )
              : (

                /*
                  OLHO ABERTO
                */
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >

                  <path
                    d="
                      M2.5 12
                      s3.5-6 9.5-6
                      9.5 6 9.5 6
                      -3.5 6-9.5 6
                      -9.5-6-9.5-6z
                    "
                  />


                  <circle
                    cx="12"
                    cy="12"
                    r="2.5"
                  />

                </svg>

              )
          }

        </button>

      </div>


      {
        ajuda && (

          <small>
            {ajuda}
          </small>

        )
      }

    </div>

  );

}