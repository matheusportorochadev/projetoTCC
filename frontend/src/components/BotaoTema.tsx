import {
  useEffect,
  useState
} from "react";

// Botão responsável por alternar o tema do sistema
export default function BotaoTema() {
  const [modoEscuro, setModoEscuro] =
    useState(() => {
      const temaSalvo =
        localStorage.getItem("tema");

      if (temaSalvo) {
        return temaSalvo === "escuro";
      }

      return window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
    });

  useEffect(() => {
    if (modoEscuro) {
      document.body.classList.add(
        "modo-escuro"
      );

      localStorage.setItem(
        "tema",
        "escuro"
      );
    } else {
      document.body.classList.remove(
        "modo-escuro"
      );

      localStorage.setItem(
        "tema",
        "claro"
      );
    }
  }, [modoEscuro]);

  return (
    <button
      type="button"
      className="botao-tema"
      onClick={() =>
        setModoEscuro(
          (estadoAtual) =>
            !estadoAtual
        )
      }
      title={
        modoEscuro
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      }
      aria-label={
        modoEscuro
          ? "Ativar modo claro"
          : "Ativar modo escuro"
      }
    >
      {modoEscuro ? "☀️" : "🌙"}
    </button>
  );
}