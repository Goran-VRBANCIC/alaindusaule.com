import test from "node:test";
import assert from "node:assert/strict";
import {
  ZONE_FILL_SORT_KEY,
  normalizeZones,
  resourceLabel,
  zoneResourceFilter,
} from "../../assets/js/grid-hydrique/zones.mjs";
import { renderZoneDetail } from "../../assets/js/grid-hydrique/templates.mjs";

test("les ressources VigiEau ont des libellés publics", () => {
  assert.equal(resourceLabel("SUP"), "Cours d’eau");
  assert.equal(resourceLabel("SOU"), "Nappes");
  assert.equal(resourceLabel("AEP"), "Eau potable");
});

test("le filtre Toutes conserve chaque ressource", () => {
  assert.equal(zoneResourceFilter("ALL"), null);
  assert.deepEqual(zoneResourceFilter("SUP"), ["==", ["get", "type"], "SUP"]);
  assert.deepEqual(zoneResourceFilter("SOU"), ["==", ["get", "type"], "SOU"]);
  assert.deepEqual(zoneResourceFilter("AEP"), ["==", ["get", "type"], "AEP"]);
});

test("la clé de tri place la crise au-dessus des niveaux faibles", () => {
  assert.deepEqual(ZONE_FILL_SORT_KEY, [
    "match", ["get", "niveauGravite"],
    "vigilance", 1,
    "alerte", 2,
    "alerte_renforcee", 3,
    "crise", 4,
    0,
  ]);
});

test("les zones sont triées par gravité et reçoivent un libellé de ressource", () => {
  const zones = normalizeZones([
    { type: "AEP", nom: "Réseau local", niveauGravite: "none" },
    { type: "SUP", nom: "Charente", niveauGravite: "crise" },
    { type: "SOU", nom: "Nappe", niveauGravite: "alerte_renforcee" },
    { type: "SUP", nom: "Cours secondaire", niveauGravite: "alerte" },
    { type: "SOU", nom: "Nappe faible", niveauGravite: "vigilance" },
  ]);

  assert.deepEqual(zones.map((zone) => zone.niveauGravite), [
    "crise", "alerte_renforcee", "alerte", "vigilance", "none",
  ]);
  assert.equal(zones[0].resourceLabel, "Cours d’eau");
  assert.equal(zones[1].resourceLabel, "Nappes");
  assert.equal(zones[4].resourceLabel, "Eau potable");
});

test("les propriétés PMTiles arreteRestriction sont normalisées pour le lien officiel", () => {
  const zones = normalizeZones([{
    type: "SUP",
    nom: "Charente-Moyenne",
    niveauGravite: "crise",
    arreteRestriction: '{"fichier":"https://vigieau.gouv.fr/arretes/charente.pdf"}',
  }]);

  assert.deepEqual(zones[0].arrete, {
    cheminFichier: "https://vigieau.gouv.fr/arretes/charente.pdf",
  });
  const html = renderZoneDetail(zones);
  assert.match(html, /href="https:\/\/vigieau\.gouv\.fr\/arretes\/charente\.pdf"/);
  assert.match(html, /rel="noopener"/);
});

test("un arreteRestriction JSON invalide ne fait pas planter le fallback", () => {
  assert.doesNotThrow(() => {
    const zones = normalizeZones([{
      type: "SUP",
      nom: "Charente-Moyenne",
      niveauGravite: "crise",
      arreteRestriction: "pas du JSON",
    }]);
    renderZoneDetail(zones);
  });
});
