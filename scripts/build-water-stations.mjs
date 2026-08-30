import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REFERENCE_LAG_DAYS = 7;
const METROPOLITAN_BOUNDS = Object.freeze({ west: -5.5, south: 41, east: 10, north: 51.5 });

export function isMetropolitanDepartment(code) {
  if (code === "2A" || code === "2B") return true;
  if (!/^\d{2}$/.test(code || "")) return false;
  const number = Number(code);
  return (number >= 1 && number <= 19) || (number >= 21 && number <= 95);
}

export function stationReferenceDate(now = new Date()) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - REFERENCE_LAG_DAYS);
  return date.toISOString().slice(0, 10);
}

export function buildStationUrls(now = new Date()) {
  const date = stationReferenceDate(now);
  return {
    piezo: `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?date_recherche=${date}&size=20000&fields=code_bss,bss_id,libelle_pe,nom_commune,code_departement,nom_departement,altitude_station,nb_mesures_piezo,date_fin_mesure,x,y`,
    hydro: "https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?en_service=true&size=10000&fields=code_station,libelle_station,libelle_commune,code_departement,libelle_departement,libelle_cours_eau,longitude_station,latitude_station,en_service,date_maj_station",
  };
}

async function fetchAll(url) {
  const records = [];
  let next = url;

  while (next) {
    const response = await fetch(next, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Hub’Eau: HTTP ${response.status}`);
    const payload = await response.json();
    records.push(...payload.data);
    next = payload.next;
  }

  return records;
}

function normalizePiezo(station) {
  return {
    code: station.code_bss,
    kind: "piezo",
    name: station.libelle_pe || station.code_bss,
    commune: station.nom_commune || "Commune non renseignée",
    departmentCode: station.code_departement,
    departmentName: station.nom_departement,
    altitude: Number(station.altitude_station) || null,
    measurementCount: Number(station.nb_mesures_piezo) || 0,
    lastMeasurement: station.date_fin_mesure,
    longitude: Number(station.x),
    latitude: Number(station.y),
  };
}

function normalizeHydro(station) {
  return {
    code: station.code_station,
    kind: "hydro",
    name: station.libelle_station || station.code_station,
    commune: station.libelle_commune || "Commune non renseignée",
    departmentCode: station.code_departement,
    departmentName: station.libelle_departement,
    watercourse: station.libelle_cours_eau || "Cours d’eau non renseigné",
    lastMeasurement: station.date_maj_station,
    longitude: Number(station.longitude_station),
    latitude: Number(station.latitude_station),
  };
}

function isMetropolitanStation(station) {
  return isMetropolitanDepartment(station.departmentCode)
    && Number.isFinite(station.longitude)
    && Number.isFinite(station.latitude)
    && station.longitude >= METROPOLITAN_BOUNDS.west
    && station.longitude <= METROPOLITAN_BOUNDS.east
    && station.latitude >= METROPOLITAN_BOUNDS.south
    && station.latitude <= METROPOLITAN_BOUNDS.north;
}

async function writeStations(fileName, source, stations) {
  const output = {
    generatedAt: new Date().toISOString(),
    source,
    stations: stations.sort((left, right) => left.code.localeCompare(right.code, "fr")),
  };
  const outputPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/data", fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function main() {
  const urls = buildStationUrls();
  const [piezoRaw, hydroRaw] = await Promise.all([fetchAll(urls.piezo), fetchAll(urls.hydro)]);
  const piezo = piezoRaw.map(normalizePiezo).filter(isMetropolitanStation);
  const hydro = hydroRaw.map(normalizeHydro).filter(isMetropolitanStation);

  await Promise.all([
    writeStations("piezo-stations.json", urls.piezo, piezo),
    writeStations("hydro-stations.json", urls.hydro, hydro),
  ]);

  console.log(`Référentiels générés : ${piezo.length} piézomètres, ${hydro.length} stations hydrométriques.`);
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
