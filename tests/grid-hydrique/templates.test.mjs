import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeHtml,
  renderKpis,
  renderDepartmentDetail,
  renderPiezoDetail,
  renderHydroDetail,
  renderMapControls,
  renderZoneDetail,
  renderStatus,
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

test("renderDepartmentDetail échappe les données et accepte un arrêté HTTPS", () => {
  const html = renderDepartmentDetail(
    { nom: '<script>alert("x")</script>', severity: "crise" },
    [{ nom: "Zone test", niveauGravite: "crise", arrete: { cheminFichier: "https://example.test/arrete.pdf" } }],
  );

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /https:\/\/example\.test\/arrete\.pdf/);
});

test("renderDepartmentDetail sépare le niveau du département et celui du point", () => {
  const html = renderDepartmentDetail(
    { nom: "Charente", severity: "crise" },
    [{ nom: "Charente-Moyenne", niveauGravite: "alerte_renforcee" }],
  );

  assert.match(html, /Niveau maximal du département[\s\S]*detail-level--crise[^>]*>Crise/);
  assert.match(html, /Au point sélectionné[\s\S]*detail-level--alerte_renforcee[^>]*>Alerte renforcée/);
});

test("renderZoneDetail trie les ressources et souligne le maximum", () => {
  const html = renderZoneDetail([
    { type: "AEP", nom: "Réseau <AEP>", niveauGravite: "vigilance" },
    { type: "SUP", nom: "<b>Charente</b>", niveauGravite: "crise", arrete: { cheminFichier: "https://example.test/crise.pdf" } },
    { type: "SOU", nom: "Nappe <SOU>", niveauGravite: "alerte_renforcee" },
  ]);

  assert.match(html, /Niveau maximal à ce point/);
  assert.ok(html.indexOf("Cours d’eau") < html.indexOf("Nappes"));
  assert.ok(html.indexOf("Nappes") < html.indexOf("Eau potable"));
  assert.match(html, /detail-level--crise[^>]*>Crise/);
  assert.match(html, /detail-level--alerte_renforcee[^>]*>Alerte renforcée/);
  assert.match(html, /detail-level--vigilance[^>]*>Vigilance/);
  assert.equal((html.match(/Niveau maximal à ce point/g) || []).length, 1);
  assert.match(html, /&lt;b&gt;Charente&lt;\/b&gt;/);
  assert.match(html, /Réseau &lt;AEP&gt;/);
  assert.match(html, /Nappe &lt;SOU&gt;/);
  assert.match(html, /href="https:\/\/example\.test\/crise\.pdf" rel="noopener"/);
});

test("renderZoneDetail échappe les noms et refuse les liens non HTTPS", () => {
  const html = renderZoneDetail([
    { type: "SUP", nom: '<img src=x onerror="alert(1)">', niveauGravite: "alerte", arrete: { cheminFichier: "javascript:alert(1)" } },
    { type: "SOU", nom: "HTTP", niveauGravite: "vigilance", arrete: { cheminFichier: "http://example.test/unsafe.pdf" } },
  ], { fallback: true });

  assert.doesNotMatch(html, /<img|javascript:|href="http:/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(html, /Détails temporairement indisponibles/);
});

test("renderMapControls expose deux groupes radio accessibles", () => {
  const html = renderMapControls();

  assert.match(html, /<fieldset[^>]*>[\s\S]*<legend>Vue de la carte<\/legend>/);
  assert.match(html, /<legend>Ressource<\/legend>/);
  assert.match(html, /name="map-mode" value="departments" checked/);
  assert.match(html, /name="map-mode" value="zones"/);
  assert.match(html, /data-zone-resources hidden disabled/);
  assert.match(html, /name="zone-resource" value="ALL" checked/);
  assert.match(html, /name="zone-resource" value="SUP"/);
  assert.match(html, /name="zone-resource" value="SOU"/);
  assert.match(html, /name="zone-resource" value="AEP"/);
  assert.match(html, /DÃ©partements|Départements/);
  assert.match(html, /Zones/);
  assert.match(html, /Cours dâ€™eau|Cours d’eau/);
  assert.match(html, /Nappes/);
  assert.match(html, /Eau potable/);
});

test("les détails de station créent un emplacement de graphique", () => {
  const piezo = renderPiezoDetail({ stationCode: "P1", value: 3.2, unit: "m", measuredAt: "2026-08-29T08:00:00Z" });
  const hydro = renderHydroDetail({ stationCode: "H1", value: 0.8, unit: "m", measuredAt: "2026-08-29T08:00:00Z" });

  assert.match(piezo, /Piézomètre P1/);
  assert.match(hydro, /Station H1/);
  assert.match(piezo, /data-chart/);
  assert.match(hydro, /data-chart/);
});

test("renderStatus décrit chargement, réussite, résultat partiel et erreur avec cache", () => {
  assert.equal(renderStatus("loading", ""), "Chargement des données officielles…");
  assert.equal(renderStatus("success", "Actualisé à 14:15"), "Actualisé à 14:15");
  assert.equal(
    renderStatus("partial", "Mesures piézométriques indisponibles."),
    "Certaines données sont indisponibles. Mesures piézométriques indisponibles.",
  );
  assert.equal(
    renderStatus("error", "Réessayez plus tard.", true),
    "Données temporairement indisponibles. Réessayez plus tard. Dernières données affichées.",
  );
});
