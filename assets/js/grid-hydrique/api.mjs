// @ts-check

const VIGIEAU = "https://api.vigieau.gouv.fr/api";
const PIEZO = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes";
const HYDRO = "https://hubeau.eaufrance.fr/api/v2/hydrometrie";

export function createWaterApi(fetchImpl = fetch) {
  async function requestJson(label, url, signal) {
    const response = await fetchImpl(url, {
      signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`${label}: HTTP ${response.status}`);
    }

    return response.json();
  }

  return {
    getDepartments: (signal) => requestJson("VigiEau", `${VIGIEAU}/departements`, signal),
    getLocalRestrictions: (longitude, latitude, signal) => {
      const query = new URLSearchParams({
        lon: String(longitude),
        lat: String(latitude),
        profil: "particulier",
      });
      return requestJson("VigiEau", `${VIGIEAU}/zones?${query}`, signal);
    },
    getPiezoViewport: (bbox, fromDate, signal) => {
      const query = new URLSearchParams({
        bbox: bbox.join(","),
        date_debut_mesure: fromDate,
        size: "5000",
      });
      return requestJson("Hub’Eau piézométrie", `${PIEZO}/chroniques_tr?${query}`, signal);
    },
    getPiezoHistory: (codeBss, fromDate, signal) => {
      const query = new URLSearchParams({
        code_bss: codeBss,
        date_debut_mesure: fromDate,
        size: "5000",
      });
      return requestJson("Hub’Eau piézométrie", `${PIEZO}/chroniques_tr?${query}`, signal);
    },
    getHydroViewport: (bbox, fromDate, signal) => {
      const query = new URLSearchParams({
        bbox: bbox.join(","),
        date_debut_obs: fromDate,
        grandeur_hydro: "H",
        size: "5000",
      });
      return requestJson("Hub’Eau hydrométrie", `${HYDRO}/observations_tr?${query}`, signal);
    },
    getHydroHistory: (codeStation, fromDate, signal) => {
      const query = new URLSearchParams({
        code_entite: codeStation,
        date_debut_obs: fromDate,
        grandeur_hydro: "H",
        size: "5000",
      });
      return requestJson("Hub’Eau hydrométrie", `${HYDRO}/observations_tr?${query}`, signal);
    },
  };
}
