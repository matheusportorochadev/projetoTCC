// ========================================
// CÓDIGO OTP DE 6 DÍGITOS
// ========================================

import {
  useRef
} from "react";


// ========================================
// TIPOS
// ========================================

type Props = {
  value: string;

  onChange: (
    valor: string
  ) => void;

  disabled?: boolean;
};


// ========================================
// COMPONENTE
// ========================================

export default function CodigoOtp({
  value,
  onChange,
  disabled = false
}: Props) {

  const inputsRef =
    useRef<
      Array<HTMLInputElement | null>
    >([]);


  // ========================================
  // ALTERAR UM DÍGITO
  // ========================================

  function alterarDigito(
    indice: number,
    valorDigitado: string
  ) {

    const numeros =
      valorDigitado.replace(
        /\D/g,
        ""
      );


    if (!numeros) {

      const atual =
        value
          .padEnd(
            6,
            " "
          )
          .split("");


      atual[indice] =
        " ";


      onChange(
        atual
          .join("")
          .replace(
            /\s/g,
            ""
          )
      );


      return;

    }


    /*
      Se o navegador preencher mais
      de um número de uma vez,
      tratamos como colagem.
    */
    if (
      numeros.length > 1
    ) {

      inserirSequencia(
        indice,
        numeros
      );

      return;

    }


    const atual =
      Array.from(
        {
          length: 6
        },
        (_, i) =>
          value[i] || ""
      );


    atual[indice] =
      numeros[0];


    onChange(
      atual.join("")
    );


    if (
      indice < 5
    ) {

      inputsRef.current[
        indice + 1
      ]?.focus();

    }

  }


  // ========================================
  // COLAR CÓDIGO
  // ========================================

  function inserirSequencia(
    indiceInicial: number,
    valor: string
  ) {

    const numeros =
      valor
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          6
        );


    if (!numeros) {
      return;
    }


    const atual =
      Array.from(
        {
          length: 6
        },
        (_, i) =>
          value[i] || ""
      );


    let indice =
      indiceInicial;


    for (
      const numero
      of numeros
    ) {

      if (
        indice > 5
      ) {
        break;
      }


      atual[indice] =
        numero;


      indice += 1;

    }


    const novoCodigo =
      atual.join("");


    onChange(
      novoCodigo
    );


    const proximoIndice =
      Math.min(
        indice,
        5
      );


    inputsRef.current[
      proximoIndice
    ]?.focus();

  }


  // ========================================
  // TECLADO
  // ========================================

  function tratarTecla(
    evento:
      React.KeyboardEvent<HTMLInputElement>,
    indice: number
  ) {

    if (
      evento.key ===
      "Backspace"
    ) {

      /*
        Se o quadrado atual estiver vazio,
        voltamos para o anterior.
      */
      if (
        !value[indice] &&
        indice > 0
      ) {

        evento.preventDefault();


        const atual =
          Array.from(
            {
              length: 6
            },
            (_, i) =>
              value[i] || ""
          );


        atual[
          indice - 1
        ] = "";


        onChange(
          atual.join("")
        );


        inputsRef.current[
          indice - 1
        ]?.focus();

      }

    }


    if (
      evento.key ===
      "ArrowLeft" &&
      indice > 0
    ) {

      evento.preventDefault();

      inputsRef.current[
        indice - 1
      ]?.focus();

    }


    if (
      evento.key ===
      "ArrowRight" &&
      indice < 5
    ) {

      evento.preventDefault();

      inputsRef.current[
        indice + 1
      ]?.focus();

    }

  }


  // ========================================
  // COLAGEM
  // ========================================

  function tratarColagem(
    evento:
      React.ClipboardEvent<HTMLInputElement>,
    indice: number
  ) {

    evento.preventDefault();


    inserirSequencia(

      indice,

      evento.clipboardData
        .getData(
          "text"
        )

    );

  }


  // ========================================
  // INTERFACE
  // ========================================

  return (

    <div className="codigo-otp">

      {
        Array.from(
          {
            length: 6
          }
        ).map(
          (_, indice) => (

            <input
              key={
                indice
              }
              ref={(elemento) => {

                inputsRef.current[
                  indice
                ] =
                  elemento;

              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={
                value[indice] ||
                ""
              }
              onChange={(evento) =>
                alterarDigito(
                  indice,
                  evento.target.value
                )
              }
              onKeyDown={(evento) =>
                tratarTecla(
                  evento,
                  indice
                )
              }
              onPaste={(evento) =>
                tratarColagem(
                  evento,
                  indice
                )
              }
              onFocus={(evento) =>
                evento.currentTarget.select()
              }
              autoComplete={
                indice === 0
                  ? "one-time-code"
                  : "off"
              }
              aria-label={
                `Dígito ${indice + 1} do código`
              }
              disabled={
                disabled
              }
            />

          )
        )
      }

    </div>

  );

}
