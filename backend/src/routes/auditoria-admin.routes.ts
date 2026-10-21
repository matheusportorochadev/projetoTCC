// ========================================
// ROTAS ADMINISTRATIVAS DE AUDITORIA
// ========================================

import { Router } from "express";

import {
  authMiddleware
} from "../middlewares/auth.middleware";

import {
  permitirPerfis
} from "../middlewares/role.middleware";

import {
  listarAuditoriaProntuarios
} from "../services/auditoria-admin.service";

// ========================================
// CRIAR ROUTER
// ========================================

const auditoriaAdminRoutes = Router();

// ========================================
// PROTEGER TODAS AS ROTAS
// ========================================

// Exige sessão válida e perfil ADMIN.
// Médicos e pacientes recebem 403.
auditoriaAdminRoutes.use(
  authMiddleware,
  permitirPerfis("ADMIN")
);

// ========================================
// CONSULTAR LOGS DE PRONTUÁRIOS
// ========================================

auditoriaAdminRoutes.get(
  "/prontuarios",
  async (req, res) => {

    try {

      // Evita aceitar arrays ou objetos
      // enviados nos parâmetros da URL.
      const obterParametro = (nome: string) => {
        const valor = req.query[nome];

        return typeof valor === "string"
          ? valor
          : undefined;
      };

      const medicoTexto =
        obterParametro("medicoId");

      let medicoId: number | undefined;

      if (medicoTexto !== undefined) {
        const numero = Number(medicoTexto);

        if (
          !Number.isSafeInteger(numero) ||
          numero <= 0
        ) {
          return res.status(400).json({
            mensagem: "Médico inválido."
          });
        }

        medicoId = numero;
      }

      const acao = obterParametro("acao");
      const resultado = obterParametro("resultado");

      const dataInicio =
        obterParametro("dataInicio");

      const dataFim =
        obterParametro("dataFim");

      if (
        resultado !== undefined &&
        resultado !== "SUCESSO" &&
        resultado !== "FALHA"
      ) {
        return res.status(400).json({
          mensagem: "Resultado inválido."
        });
      }

      if (
        (dataInicio && !/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) ||
        (dataFim && !/^\d{4}-\d{2}-\d{2}$/.test(dataFim))
      ) {
        return res.status(400).json({
          mensagem: "Formato de data inválido."
        });
      }

      if (
        acao &&
        (
          acao.length > 50 ||
          !/^[A-Z_]+$/.test(acao)
        )
      ) {
        return res.status(400).json({
          mensagem: "Ação inválida."
        });
      }

      const registros =
        await listarAuditoriaProntuarios({
          medicoId,
          acao,
          resultado,
          dataInicio,
          dataFim
        });

      return res.json({
        totalRetornado: registros.length,
        registros
      });

    } catch (erro) {

      console.error(
        "Erro na consulta de auditoria:",
        erro instanceof Error
          ? erro.message
          : "Erro desconhecido"
      );

      return res.status(500).json({
        mensagem:
          "Não foi possível consultar os logs."
      });
    }
  }
);

export default auditoriaAdminRoutes;