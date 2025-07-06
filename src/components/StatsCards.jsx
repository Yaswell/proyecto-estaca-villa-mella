import React from "react";

function StatsCards({ stats, dateRange }) {
  const rangoTexto = getRangoTexto(dateRange?.start, dateRange?.end);

  return (
    <div className="stats-cards">
      <div className="grid-4">
        <div className="card">
          <p className="metric-label">Total Conversos {rangoTexto}</p>
          <p className="metric-value">{stats.total || 0}</p>
        </div>
        <div className="card">
          <p className="metric-label">Total con llamamiento</p>
          <p className="metric-value">{stats.conLlamamiento || 0}</p>
        </div>
        <div className="card">
          <p className="metric-label">Con Recomendación Activa</p>
          <p className="metric-value">{stats.conRecomendacion || 0}</p>
        </div>
        <div className="card">
          <p className="metric-label">Promedio (días) para Recomendación</p>
          <p className="metric-value">{stats.promedioDias || 0}</p>
        </div>
      </div>
      <div className="card">
        <p className="metric-label">Promedio (días) para Sacerdocio</p>
        <p className="metric-value">{stats.promedioDiasSacerdocio || 0}</p>
      </div>
    </div>
  );
}

function getRangoTexto(start, end) {
  if (!start || !end) return "";

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const diffMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;

  if (diffMonths === 1) {
    return `${months[start.getMonth()]} ${start.getFullYear()}`;
  }

  return `${months[start.getMonth()]} ${start.getFullYear()} - ${
    months[end.getMonth()]
  } ${end.getFullYear()}`;
}

export default StatsCards;
