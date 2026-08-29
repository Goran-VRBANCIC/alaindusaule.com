import test from "node:test";
import assert from "node:assert/strict";
import { createWaterApi } from "../../assets/js/grid-hydrique/api.mjs";

test("getDepartments appelle l’endpoint national VigiEau", async () => {
  const calls = [];
  const api = createWaterApi(async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => [] };
  });

  await api.getDepartments();

  assert.equal(calls[0], "https://api.vigieau.gouv.fr/api/departements");
});

test("getPiezoViewport encode l’emprise et la date", async () => {
  const calls = [];
  const api = createWaterApi(async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({ data: [], next: null }) };
  });

  await api.getPiezoViewport([-1, 44, 0, 45], "2026-08-28");

  assert.match(calls[0], /bbox=-1%2C44%2C0%2C45/);
  assert.match(calls[0], /date_debut_mesure=2026-08-28/);
});

test("une réponse non réussie lève une erreur lisible", async () => {
  const api = createWaterApi(async () => ({ ok: false, status: 503, json: async () => ({}) }));

  await assert.rejects(api.getDepartments(), /VigiEau: HTTP 503/);
});
