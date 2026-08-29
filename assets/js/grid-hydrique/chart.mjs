// @ts-check

const MAX_POINTS = 600;

export function buildLineChartModel(values, width, height) {
  const sorted = values
    .filter((item) => Number.isFinite(item.value) && Number.isFinite(Date.parse(item.date)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const sampled = downsample(sorted, MAX_POINTS);
  const rawMinimum = Math.min(...sampled.map((point) => point.value));
  const rawMaximum = Math.max(...sampled.map((point) => point.value));
  const minimum = rawMinimum === rawMaximum ? rawMinimum - 0.5 : rawMinimum;
  const maximum = rawMinimum === rawMaximum ? rawMaximum + 0.5 : rawMaximum;
  const padding = { top: 20, right: 20, bottom: 36, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = sampled.map((point, index) => ({
    ...point,
    x: padding.left + (sampled.length === 1 ? chartWidth / 2 : (index / (sampled.length - 1)) * chartWidth),
    y: padding.top + ((maximum - point.value) / (maximum - minimum)) * chartHeight,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)},${round(point.y)}`).join(" ");

  return {
    width,
    height,
    padding,
    points,
    path,
    minimum: rawMinimum,
    maximum: rawMaximum,
    startDate: points[0]?.date || null,
    endDate: points.at(-1)?.date || null,
  };
}

function downsample(values, limit) {
  if (values.length <= limit) return values;
  const result = [values[0]];
  for (let index = 1; index < limit - 1; index += 1) {
    const sourceIndex = Math.round((index * (values.length - 1)) / (limit - 1));
    result.push(values[sourceIndex]);
  }
  result.push(values.at(-1));
  return result;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export function renderLineChart(container, model, title, unit = "m") {
  container.replaceChildren();
  if (model.points.length === 0) {
    container.textContent = "Aucune mesure disponible pour cette période.";
    return;
  }

  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  const titleId = `chart-title-${crypto.randomUUID()}`;
  const descriptionId = `chart-description-${crypto.randomUUID()}`;
  svg.setAttribute("viewBox", `0 0 ${model.width} ${model.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-labelledby", `${titleId} ${descriptionId}`);

  const titleElement = document.createElementNS(namespace, "title");
  titleElement.id = titleId;
  titleElement.textContent = title;
  const description = document.createElementNS(namespace, "desc");
  description.id = descriptionId;
  description.textContent = `${model.points.length} mesures, de ${model.minimum} à ${model.maximum} ${unit}.`;
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", model.path);
  path.setAttribute("class", "water-chart__line");
  path.setAttribute("vector-effect", "non-scaling-stroke");
  svg.append(titleElement, description, path);

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Consulter les valeurs du graphique";
  const table = document.createElement("table");
  table.className = "water-chart__table";
  table.innerHTML = "<thead><tr><th>Date</th><th>Valeur</th></tr></thead>";
  const body = document.createElement("tbody");
  for (const point of model.points) {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const valueCell = document.createElement("td");
    dateCell.textContent = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(point.date));
    valueCell.textContent = `${point.value.toLocaleString("fr-FR")} ${unit}`;
    row.append(dateCell, valueCell);
    body.append(row);
  }
  table.append(body);
  details.append(summary, table);
  container.append(svg, details);
}
