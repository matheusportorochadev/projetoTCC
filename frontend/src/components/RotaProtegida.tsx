// ========================================
// ROTA PROTEGIDA
// ========================================

import {
  useEffect,
  useState
} from "react";

import {
  Navigate
} from "react-router-dom";

import type {
  ReactNode
} from "react";


// ========================================
// TIPOS
// ========================================

type TipoUsuario =
  | "ADMIN"
  | "MEDICO"
  | "PACIENTE";


type Props = {

  tipoPermitido:
    TipoUsuario;

  children:
    ReactNode;

};


type RespostaPerfil = {

  mensagem:
    string;

  usuario?: {

    id:
      number;

    tipo:
      TipoUsuario;

  };

};


// ========================================
// ROTA INICIAL POR PERFIL
// ========================================

function obterRotaInicial(
  tipo: TipoUsuario
) {

  if (
    tipo === "ADMIN"
  ) {

    return "/admin";

  }


  if (
    tipo === "MEDICO"
  ) {

    return "/medico";

  }


  return "/paciente";

}


// ========================================
// COMPONENTE
// ========================================

export default function RotaProtegida({
  tipoPermitido,
  children
}: Props) {

  // ========================================
  // ESTADOS
  // ========================================

  const [
    verificando,
    setVerificando
  ] =
    useState(true);


  const [
    autenticado,
    setAutenticado
  ] =
    useState(false);


  const [
    tipoUsuario,
    setTipoUsuario
  ] =
    useState<TipoUsuario | null>(
      null
    );


  // ========================================
  // VERIFICAR SESSÃO
  // ========================================

  useEffect(() => {

    let componenteAtivo =
      true;


    async function verificarSessao() {

      try {

        /*
          O JWT não é lido pelo frontend.

          O navegador envia automaticamente
          o cookie HttpOnly access_token.
        */
        const resposta =
          await fetch(
            "http://localhost:3000/perfil",
            {

              credentials:
                "include"

            }
          );


        if (
          !componenteAtivo
        ) {

          return;

        }


        // ========================================
        // SESSÃO INVÁLIDA
        // ========================================

        if (
          !resposta.ok
        ) {

          setAutenticado(
            false
          );

          setTipoUsuario(
            null
          );

          return;

        }


        const dados:
          RespostaPerfil =
            await resposta.json();


        if (
          !dados.usuario
        ) {

          setAutenticado(
            false
          );

          setTipoUsuario(
            null
          );

          return;

        }


        // ========================================
        // SESSÃO VÁLIDA
        // ========================================

        setAutenticado(
          true
        );


        setTipoUsuario(
          dados.usuario.tipo
        );

      } catch (erro) {

        console.error(
          "Erro ao verificar sessão:",
          erro
        );


        if (
          componenteAtivo
        ) {

          setAutenticado(
            false
          );

          setTipoUsuario(
            null
          );

        }

      } finally {

        if (
          componenteAtivo
        ) {

          setVerificando(
            false
          );

        }

      }

    }


    verificarSessao();


    return () => {

      componenteAtivo =
        false;

    };

  }, []);


  // ========================================
  // AGUARDANDO BACKEND
  // ========================================

  /*
    Enquanto /perfil está sendo consultado,
    a página protegida ainda NÃO é renderizada.

    Isso evita o usuário ver o painel
    por alguns milissegundos antes do
    redirecionamento.
  */
  if (
    verificando
  ) {

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        Verificando sessão...
      </div>
    );

  }


  // ========================================
  // NÃO AUTENTICADO
  // ========================================

  if (
    !autenticado ||
    !tipoUsuario
  ) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  // ========================================
  // PERFIL INCORRETO
  // ========================================

  /*
    Exemplo:

    um PACIENTE tenta digitar:

    /admin

    Ele não verá o painel administrativo.

    O sistema o envia para sua própria
    área autenticada.
  */
  if (
    tipoUsuario !==
    tipoPermitido
  ) {

    return (
      <Navigate
        to={
          obterRotaInicial(
            tipoUsuario
          )
        }
        replace
      />
    );

  }


  // ========================================
  // ACESSO AUTORIZADO
  // ========================================

  return children;

}
