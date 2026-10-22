import { randomBytes } from 'node:crypto';
import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { iniciarSmtpLocal } from './smtp-local';
import { iniciarApiIsolada } from './api-isolada';
import { usarNegocio, type Negocio } from './negocio';

type Smtp = Awaited<ReturnType<typeof iniciarSmtpLocal>>;
type Ambiente = { smtp: Smtp; baseURL: string; chaveJwt: string; reiniciar(): Promise<string> };
// Instância por teste: limitações reais por IP não contaminam casos independentes.
export const test = base.extend<{ ambiente: Ambiente; negocio: Negocio; api: APIRequestContext }>({
  ambiente: async ({ playwright }, usarFixture) => {
    void playwright;
    const smtp = await iniciarSmtpLocal();
    try {
      const chaveJwt = randomBytes(32).toString('hex');
      let api = await iniciarApiIsolada({ ...smtp.ambiente, JWT_SECRET: chaveJwt });
      try { await usarFixture({ smtp, baseURL: api.baseURL, chaveJwt,
        async reiniciar() {
          await api.fechar();
          api = await iniciarApiIsolada({ ...smtp.ambiente, JWT_SECRET: chaveJwt });
          return api.baseURL;
        },
      }); } finally { await api.fechar(); }
    } finally { await smtp.fechar(); }
  },
  api: async ({ playwright, ambiente }, usarFixture) => {
    const api = await playwright.request.newContext({ baseURL: ambiente.baseURL });
    try { await usarFixture(api); } finally { await api.dispose(); }
  },
  negocio: async ({ playwright, ambiente }, usarFixture) => { await usarNegocio(playwright, ambiente.baseURL, usarFixture); },
});
export { expect };
