
import {
  Component
} from "react";

import type {
  ErrorInfo,
  ReactNode
} from "react";

// ========================================
// PROTEÇÃO DO PAINEL DE PRONTUÁRIOS
// ========================================
//
// Se o painel clínico lançar um erro
// durante a renderização, esta classe
// impede que toda a página fique branca.
//
// O erro é apresentado de forma segura
// ao usuário e os detalhes técnicos
// aparecem no console do desenvolvedor.
//
// Não registramos dados clínicos.

type Propriedades = {
  children: ReactNode;
  onVoltar: () => void;
};

type Estado = {
  ocorreuErro: boolean;
};

export default class ErroPainelProntuario
  extends Component<Propriedades, Estado> {

  state: Estado = {
    ocorreuErro: false
  };

  // Detecta erros dos componentes filhos.
  static getDerivedStateFromError(): Estado {
    return {
      ocorreuErro: true
    };
  }

  // Registra a falha técnica no console.
  componentDidCatch(
    erro: Error,
    informacoes: ErrorInfo
  ) {
    console.error(
      "[PAINEL DE PRONTUÁRIOS] Falha de renderização:",
      erro.message
    );

    console.error(
      "[PAINEL DE PRONTUÁRIOS] Componentes:",
      informacoes.componentStack
    );
  }

  // Retorna aos cartões da página.
  voltar = () => {
    this.setState({
      ocorreuErro: false
    });

    this.props.onVoltar();
  };

  render() {

    if (this.state.ocorreuErro) {
      return (
        <section
          className="prontuario-cartao"
          role="alert"
        >
          <h2>
            Não foi possível abrir o painel
          </h2>

          <p className="prontuario-descricao">
            Ocorreu um erro na interface de
            prontuários. Nenhum dado foi
            enviado para salvamento por
            esta tela.
          </p>

          <p className="prontuario-ajuda">
            Abra o console do navegador para
            identificar o componente que
            apresentou a falha.
          </p>

          <button
            type="button"
            className="prontuario-botao"
            onClick={this.voltar}
          >
            Voltar aos prontuários
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
