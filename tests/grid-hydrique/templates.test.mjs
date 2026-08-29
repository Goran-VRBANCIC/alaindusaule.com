import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  renderKpis,
  restrictionColor,
} from "../../assets/js/grid-hydrique/templates.mjs";

test("renderKpis produit quatre indicateurs officiels", () => {
  const html = renderKpis({
    total: 96,
    crise: 12,
    alerteRenforcee: 18,
    alerte: 8,
    vigilance: 4,
    sansRestriction: 54,
  }, "29 août 2026 à 14:15");

  assert.equal((html.match(/class="water-kpi"/g) || []).length, 4);
  assert.match(html, />12</);
  assert.match(html, /Alerte renforcée/);
  assert.match(html, /Sans restriction/);
  assert.match(html, /29 août 2026 à 14:15/);
  assert.equal((html.match(/Source : VigiEau/g) || []).length, 4);
});

test("escapeHtml neutralise le contenu provenant des API", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});

test("restrictionColor associe les couleurs accessibles", () => {
  assert.equal(restrictionColor("crise"), "#8b1e1e");
  assert.equal(restrictionColor("alerte_renforcee"), "#d96b27");
  assert.equal(restrictionColor("alerte"), "#e3a62f");
  assert.equal(restrictionColor("vigilance"), "#f2d36b");
  assert.equal(restrictionColor(null), "#d8e4e8");
});
