import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_SIZE = 350;
const METROPOLITAN_BOUNDS = Object.freeze({ west: -5.5, south: 41, east: 10, north: 51.5 });
const PIEZO_URL = "https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?nb_mesures_piezo_min=1000&size=1000&fields=code_bss,bss_id,libelle_pe,nom_commune,code_departement,nom_departement,altitude_station,nb_mesures_piezo,date_fin_mesure,x,y";
const HYDRO_URL = "https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?en_service=true&size=1000&fields=code_station,libelle_station,libelle_commune,code_departement,libelle_departement,libelle_cours_eau,longitude_station,latitude_station,en_service,date_maj_station";

export function spatialSample(stations, limit, getCoordinates, getScore) {
  if (stations.length <= limit) return [...stations];

  const ordered = [...stations].sort((a, b) => getScore(b) - getScore(a));
  const selected = [ordered.shift()];
  const candidates = ordered.map((station) => ({
    station,
    distance: squaredDistance(getCoordinates(station), getCoordinates(selected[0])),
  }));

  while (selected.length < limit && candidates.length > 0) {
    let bestIndex = 0;
    for (let index = 1; index < candidates.length; index += 1) {
      if (candidates[index].distance > candidates[bestIndex].distance) bestIndex = index;
    }

    const [{ station }] = candidates.splice(bestIndex, 1);
    selected.push(station);
    const coordinates = getCoordinates(station);

    for (const candidate of candidates) {
      candidate.distance = Math.min(
        candidate.distance,
        squaredDistance(getCoordinates(candidate.station), coordinates),
      );
    }
  }

  return selected;
}

function squaredDistance([longitudeA, latitudeA], [longitudeB, latitudeB]) {
  return (longitudeA - longitudeB) ** 2 + (latitudeA - latitudeB) ** 2;
}

function isMetropolitan(longitude, latitude) {
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= METROPOLITAN_BOUNDS.west
    && longitude <= METROPOLITAN_BOUNDS.east
    && latitude >= METROPOLITAN_BOUNDS.south
    && latitude <= METROPOLITAN_BOUNDS.north;
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

async function writeSample(fileName, source, stations) {
  const output = {
    generatedAt: new Date().toISOString(),
    source,
    stations: stations.sort((a, b) => a.code.localeCompare(b.code, "fr")),
  };
  const outputPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/data", fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function main() {
  const [piezoRaw, hydroRaw] = await Promise.all([fetchAll(PIEZO_URL), fetchAll(HYDRO_URL)]);
  const piezo = piezoRaw.map(normalizePiezo).filter((station) => isMetropolitan(station.longitude, station.latitude));
  const hydro = hydroRaw.map(normalizeHydro).filter((station) => isMetropolitan(station.longitude, station.latitude));
  const coordinates = (station) => [station.longitude, station.latitude];

  await Promise.all([
    writeSample(
      "piezo-stations.json",
      PIEZO_URL,
      spatialSample(piezo, SAMPLE_SIZE, coordinates, (station) => station.measurementCount),
    ),
    writeSample(
      "hydro-stations.json",
      HYDRO_URL,
      spatialSample(hydro, SAMPLE_SIZE, coordinates, () => 1),
    ),
  ]);

  console.log(`Échantillons générés : ${SAMPLE_SIZE} piézomètres, ${SAMPLE_SIZE} stations hydrométriques.`);
}

const isMainModule = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
