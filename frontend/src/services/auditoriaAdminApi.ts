/* ========================================
   API DE AUDITORIA ADMINISTRATIVA

   Corrige o erro de JSON quando a API
   responde HTML (por exemplo, rota 404).
======================================== */

const API_URL = "http://localhost:3000";

export type EventoAuditoria = {
  id: number;
  usuarioId: number | null;
  medicoId: number | null;
  pacienteId: number | null;
  prontuarioId: number | null;
  acao: string;
  resultado: string;
  requisicaoId: string | null;
  createdAt: string;
};

export type FiltrosAuditoria = {
  medicoId?: number;
  acao?: string;
  resultado?: "SUCESSO" | "FALHA";
  dataInicio?: string;
  dataFim?: string;
};

export type RespostaAuditoria = {
  totalRetornado: number;
  registros: EventoAuditoria[];
};

// Lê a resposta UMA vez como texto.
// Só tenta JSON quando o conteúdo permitir.
async function lerRespostaSegura(
  resposta: Response,
  endereco: string
): Promise<unknown> {
  const corpo = await resposta.text();
  const tipo = resposta.headers.get("content-type") ?? "";
  const pareceHtml = /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(corpo);

  if (pareceHtml || !tipo.toLowerCase().includes("application/json")) {
    throw new Error(
      `A rota de auditoria não retornou JSON (HTTP ${resposta.status}). ` +
      `Endereço: ${endereco}. ` +
      "Confira se o backend está ativo na porta 3000 e se " +
      "app.use('/admin/auditoria', auditoriaAdminRoutes) " +
      "está registrado antes do tratamento de erros."
    );
  }

  let dados: unknown;

  try {
    dados = JSON.parse(corpo);
  } catch {
    throw new Error(
      `O backend retornou um JSON inválido (HTTP ${resposta.status}). ` +
      `Endereço: ${endereco}.`
    );
  }

  if (!resposta.ok) {
    const mensagem = (
      typeof dados === "object" &&
      dados !== null &&
      "mensagem" in dados &&
      typeof dados.mensagem === "string"
    ) ? dados.mensagem : "Falha ao consultar os logs.";

    throw new Error(`HTTP ${resposta.status}: ${mensagem}`);
  }

  return dados;
}

// Somente metadados de auditoria são recebidos.
// O conteúdo clínico dos prontuários nunca
// é solicitado por esta função.
export async function listarAuditoriaAdmin(
  filtros: FiltrosAuditoria = {}
): Promise<RespostaAuditoria> {
  const parametros = new URLSearchParams();

  if (filtros.medicoId) {
    parametros.set("medicoId", String(filtros.medicoId));
  }
  if (filtros.acao) {
    parametros.set("acao", filtros.acao);
  }
  if (filtros.resultado) {
    parametros.set("resultado", filtros.resultado);
  }
  if (filtros.dataInicio) {
    parametros.set("dataInicio", filtros.dataInicio);
  }
  if (filtros.dataFim) {
    parametros.set("dataFim", filtros.dataFim);
  }

  const query = parametros.toString();
  const endereco =
    `${API_URL}/admin/auditoria/prontuarios` +
    (query ? `?${query}` : "");

  const resposta = await fetch(endereco, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" }
  });

  const dados = await lerRespostaSegura(resposta, endereco);

  if (
    typeof dados !== "object" ||
    dados === null ||
    !("registros" in dados) ||
    !Array.isArray(dados.registros)
  ) {
    throw new Error("O backend retornou uma lista de auditoria inválida.");
  }

  return dados as RespostaAuditoria;
}
