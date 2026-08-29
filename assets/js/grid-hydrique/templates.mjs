// @ts-check

const RESTRICTION_COLORS = Object.freeze({
  crise: "#8b1e1e",
  alerte_renforcee: "#d96b27",
  alerte: "#e3a62f",
  vigilance: "#f2d36b",
  none: "#d8e4e8",
});

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function restrictionColor(level) {
  return RESTRICTION_COLORS[level] || RESTRICTION_COLORS.none;
}

export function renderKpis(summary, updatedAt) {
  const items = [
    { value: summary.crise, label: "Départements en crise" },
    { value: summary.alerteRenforcee, label: "Alerte renforcée" },
    { value: summary.sansRestriction, label: "Sans restriction" },
    { value: updatedAt, label: "Dernière actualisation" },
  ];

  return items.map((item) => `
    <article class="water-kpi">
      <strong class="water-kpi__value">${escapeHtml(item.value)}</strong>
      <span class="water-kpi__label">${escapeHtml(item.label)}</span>
      <small>Source : VigiEau</small>
    </article>
  `).join("");
}

export function renderStatus(state, message) {
  const labels = {
    loading: "Chargement des données officielles…",
    success: message,
    partial: `Certaines données sont indisponibles. ${message}`,
    error: `Données temporairement indisponibles. ${message}`,
  };
  return escapeHtml(labels[state] || message);
}
