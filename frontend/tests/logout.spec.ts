import { test, expect } from '@playwright/test';

// Verifica somente a reação do React. A revogação real é coberta na integração.
test.describe('Confirmação de logout na interface', () => {
  for (const perfil of [
    { tipo: 'ADMIN', rota: '/admin' },
    { tipo: 'MEDICO', rota: '/medico/pacientes' },
    { tipo: 'PACIENTE', rota: '/paciente' },
  ]) {
    for (const falha of [false, true]) {
      test(`${perfil.tipo}: ${falha ? 'preserva sessão e permite repetir após 503' : 'sai após confirmação do backend'}`, async ({ page }) => {
        let falhar = falha;
        await page.addInitScript(usuario => localStorage.setItem('usuario', JSON.stringify(usuario)), {
          id: 1, nome: 'Usuário Fictício', tipo: perfil.tipo,
        });
        await page.route('http://localhost:3000/**', async route => {
          const caminho = new URL(route.request().url()).pathname;
          if (caminho === '/perfil') {
            return route.fulfill({ json: { usuario: { id: 1, tipo: perfil.tipo } } });
          }
          if (caminho === '/auth/logout') {
            return route.fulfill({ status: falhar ? 503 : 200, json: {
              mensagem: falhar ? 'Não foi possível encerrar a sessão com segurança. Tente novamente.' : 'Logout realizado.',
            } });
          }
          return route.fulfill({ json: [] });
        });
        await page.goto(perfil.rota);
        await page.getByRole('button', { name: 'Sair', exact: true }).filter({ visible: true }).click();
        if (falha) {
          await expect(page.getByRole('alert')).toHaveText('Não foi possível encerrar a sessão com segurança. Tente novamente.');
          await expect(page).toHaveURL(new RegExp(`${perfil.rota}$`));
          expect(await page.evaluate(() => localStorage.getItem('usuario') !== null)).toBe(true);
          falhar = false;
          await page.getByRole('button', { name: 'Sair', exact: true }).filter({ visible: true }).click();
        }
        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem('usuario'))).toBeNull();
      });
    }
  }
});
