// ========================================
// MODAL PADRÃO DO SISTEMA
// ========================================

import {
  useEffect
} from "react";

import "../styles/modalSistema.css";


// ========================================
// TIPOS
// ========================================

type TipoModal =
  | "padrao"
  | "aviso"
  | "sucesso"
  | "erro"
  | "perigo";


type ModalSistemaProps = {

  aberto: boolean;

  titulo: string;

  mensagem: string;

  tipo?: TipoModal;

  textoConfirmar?: string;

  textoCancelar?: string;

  carregando?: boolean;

  onConfirmar: () => void;

  onCancelar?: () => void;
};


// ========================================
// COMPONENTE
// ========================================

export default function ModalSistema({
  aberto,
  titulo,
  mensagem,
  tipo = "padrao",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  carregando = false,
  onConfirmar,
  onCancelar
}: ModalSistemaProps) {


  // ========================================
  // FECHAR COM ESC
  // ========================================

  useEffect(() => {

    if (!aberto) {
      return;
    }


    function pressionarTecla(
      evento: KeyboardEvent
    ) {

      if (
        evento.key === "Escape" &&
        onCancelar &&
        !carregando
      ) {

        onCancelar();

      }
    }


    document.addEventListener(
      "keydown",
      pressionarTecla
    );


    return () => {

      document.removeEventListener(
        "keydown",
        pressionarTecla
      );

    };

  }, [
    aberto,
    onCancelar,
    carregando
  ]);


  // ========================================
  // TRAVAR SCROLL DA PÁGINA
  // ========================================

  useEffect(() => {

    if (!aberto) {
      return;
    }


    const overflowAnterior =
      document.body.style.overflow;


    document.body.style.overflow =
      "hidden";


    return () => {

      document.body.style.overflow =
        overflowAnterior;

    };

  }, [aberto]);


  // ========================================
  // MODAL FECHADO
  // ========================================

  if (!aberto) {
    return null;
  }


  // ========================================
  // ÍCONE
  // ========================================

  function obterIcone() {

    if (
      tipo === "sucesso"
    ) {
      return "✓";
    }


    if (
      tipo === "erro" ||
      tipo === "perigo"
    ) {
      return "!";
    }


    if (
      tipo === "aviso"
    ) {
      return "!";
    }


    return "i";
  }


  // ========================================
  // CLIQUE NO FUNDO
  // ========================================

  function clicarOverlay(
    evento:
      React.MouseEvent<HTMLDivElement>
  ) {

    if (
      evento.target ===
        evento.currentTarget &&
      onCancelar &&
      !carregando
    ) {

      onCancelar();

    }
  }


  // ========================================
  // INTERFACE
  // ========================================

  return (

    <div
      className="modal-sistema-overlay"
      onMouseDown={
        clicarOverlay
      }
    >

      <div
        className={
          `modal-sistema modal-sistema-${tipo}`
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-sistema-titulo"
        aria-describedby="modal-sistema-mensagem"
      >

        <div
          className="modal-sistema-conteudo"
        >

          <div
            className={
              `modal-sistema-icone modal-sistema-icone-${tipo}`
            }
            aria-hidden="true"
          >
            {obterIcone()}
          </div>


          <div
            className="modal-sistema-textos"
          >

            <h2
              id="modal-sistema-titulo"
            >
              {titulo}
            </h2>


            <p
              id="modal-sistema-mensagem"
            >
              {mensagem}
            </p>

          </div>

        </div>


        <div
          className="modal-sistema-acoes"
        >

          {
            onCancelar && (

              <button
                type="button"
                className="modal-sistema-cancelar"
                onClick={
                  onCancelar
                }
                disabled={
                  carregando
                }
              >
                {textoCancelar}
              </button>

            )
          }


          <button
            type="button"
            className={
              `modal-sistema-confirmar modal-sistema-confirmar-${tipo}`
            }
            onClick={
              onConfirmar
            }
            disabled={
              carregando
            }
          >

            {
              carregando
                ? "Aguarde..."
                : textoConfirmar
            }

          </button>

        </div>

      </div>

    </div>

  );
}
