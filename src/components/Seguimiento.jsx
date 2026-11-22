import { hitos, metricas } from "../utils/seguimiento.js";
import "./seguimiento.css";

const number = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 1 });
const fmt = (value) => number.format(value);
const result = (value, unit) => value === null ? "Sin dato" :
  unit === "%" ? `${fmt(value)} %` : `${fmt(value / 7)} sem.`;
const target = ({ goal, unit }) => unit === "%" ? `${goal} %` : "2 semanas";
const duration = (value) => value === null ? "Sin dato" : `${fmt(value)} días · ${fmt(value / 7)} sem.`;

function comparison({ value }, { goal, unit }) {
  if (value === null) return { text: "Sin datos para comparar", tone: "empty" };
  const gap = unit === "%" ? value - goal : goal - value;
  if (Math.abs(gap) < 1e-8) return { text: "En la meta", tone: "good" };
  const amount = `${fmt(Math.abs(gap))} ${unit === "%" ? "pp" : "días"}`;
  return gap > 0 ? {
    text: unit === "%" ? `${amount} por encima` : `${amount} más rápido`, tone: "good",
  } : {
    text: unit === "%" ? `Faltan ${amount}` : `${amount} más de lo previsto`, tone: "warn",
  };
}

function fromHistory(stats, history, name) {
  if (stats.envio.value !== null) return stats;
  const matches = history.filter((row) => row.unidad === name && row.total > 0);
  if (matches.length !== 1) return stats;
  const { enviados, total } = matches[0];
  return { ...stats, envio: { count: enviados, total, value: enviados / total * 100, historical: true } };
}

function MetricCard({ hito, metric }) {
  const { key, label, unit, goal } = hito;
  const gap = comparison(metric, hito);
  const scale = unit === "%" ? 100 : Math.max(28, metric.value ?? 0);
  return (
    <article className={`sr-card sr-goal sr-goal--${gap.tone}`} key={key}>
      <h3>{label}</h3>
      <strong>{result(metric.value, unit)}</strong>
      <div className="sr-goal-target">Meta: <b>{target(hito)}</b></div>
      <span className={`sr-badge sr-badge--${gap.tone}`}>{gap.text}</span>
      {metric.value !== null && (
        <div className="sr-track">
          <progress aria-label={label} value={metric.value} max={scale} />
          <span aria-hidden="true" style={{ left: `${goal / scale * 100}%` }} />
        </div>
      )}
      <small>{unit === "%" ? `${metric.count} de ${metric.total} registrados` :
        metric.value === null ? "Sin fechas suficientes" : metric.estimados
          ? `${fmt(metric.value)} días · ${metric.estimados} estimados${metric.exactos ? ` y ${metric.exactos} con fecha real` : ""}`
          : `${fmt(metric.value)} días · ${metric.count} con fechas válidas`}</small>
      {["diasOrdenacion", "diasRecomendacion"].includes(key) && <small>Tiempo desde la confirmación</small>}
      {key === "ordenacion" && <small>Base: varones que cumplen 12 este año o mayores</small>}
      {key === "recomendacion" && <small>Base: personas que cumplen 12 este año o mayores</small>}
      {metric.historical && <small>Historia familiar · sin filtro de fechas</small>}
    </article>
  );
}

export default function Seguimiento({ rows, unidad, historial, onUnidad }) {
  const grupos = new Map();
  for (const row of rows) {
    const key = row.Unidad?.trim() || "Sin unidad";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(row);
  }
  const summary = fromHistory(metricas(unidad === "Estaca" ? rows : grupos.get(unidad) || []), historial, unidad);
  const units = [...grupos].sort(([a], [b]) => a.localeCompare(b, "es")).map(([name, members]) => [
    name, fromHistory(metricas(members), historial, name),
  ]);
  return (
    <section aria-labelledby="seguimiento-title">
      <header className="sr-header">
        <p className="sr-kicker">CONVERSOS RECIENTES · VILLA MELLA</p>
        <h1 id="seguimiento-title">Seguimiento de miembros nuevos</h1>
        <p>Unidad seleccionada: <strong>{unidad === "Estaca" ? "Toda la estaca" : unidad}</strong></p>
      </header>
      <div className="sr-section">
        <h2>Resultados frente a las metas</h2>
        <p>Las tarjetas muestran el resultado de la unidad seleccionada. La marca de cada barra indica la meta.</p>
        <div className="sr-grid sr-goals">
          {hitos.map(hito => <MetricCard key={hito.key} hito={hito} metric={summary[hito.key]} />)}
        </div>
      </div>
      <div className="sr-section">
        <h2>Detalles de {unidad === "Estaca" ? "la estaca" : unidad}</h2>
        <div className="sr-grid">
          <article className="sr-card"><h3>Bautismos</h3><strong>{summary.bautismos}</strong><small>Registros del período</small></article>
          {[["Confirmaciones", summary.confirmaciones], ["Lección posbautismal", summary.lecciones], ["Visitas al templo", summary.visitas]].map(([label, metric]) => (
            <article className="sr-card" key={label}><h3>{label}</h3>
              <strong>{metric.count ? fmt(metric.count) : "Sin dato"}</strong>
              <small>{metric.count ? `${duration(metric.value)} desde ${label === "Visitas al templo" ? "la confirmación" : "el bautismo"}` : "No hay fechas válidas registradas"}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="sr-section">
        <h2>Comparación por barrio o rama</h2>
        <p>Selecciona una unidad en la tabla para ver sus tarjetas y detalles.</p>
        {units.length ? <div className="sr-table" tabIndex="0" role="region" aria-label="Comparación por barrio o rama">
          <table>
            <thead><tr><th scope="col">Barrio o rama</th><th scope="col">Bautismos</th>
              {hitos.map(hito => <th key={hito.key} scope="col">{hito.label}<small>Meta: {target(hito)}</small></th>)}</tr></thead>
            <tbody>{units.map(([name, stats]) => (
              <tr key={name} className={unidad === name ? "sr-unit-selected" : undefined}>
                <th scope="row"><button className="sr-unit-link" type="button" aria-pressed={unidad === name} onClick={() => onUnidad(name)}>{name}</button></th>
                <td>{stats.bautismos}</td>
                {hitos.map(hito => {
                  const metric = stats[hito.key];
                  const gap = comparison(metric, hito);
                  return <td key={hito.key}><b>{result(metric.value, hito.unit)}{metric.historical ? "*" : ""}{metric.estimados ? " · estimado" : ""}</b><small className={`sr-text--${gap.tone}`}>{gap.text}</small></td>;
                })}
              </tr>
            ))}</tbody>
          </table>
        </div> : <p>No hay bautismos registrados para este período.</p>}
      </div>
      <p className="sr-note">pp = puntos porcentuales. Tiempos de ordenación, recomendación y visita: desde una confirmación válida; sin ella no se calculan. La lección cuenta desde el bautismo. Tiempo a recomendación: se usa la fecha de expedición si está registrada; si falta, se aplica el método del reporte inicial a recomendaciones activas o próximas a vencer. * Envío de nombres: cuando no hay datos individuales, se muestra el cociente de Historia familiar para la misma unidad, sin aplicar el filtro de fechas. Envío de nombres y visita al templo son indicadores distintos.</p>
    </section>
  );
}
