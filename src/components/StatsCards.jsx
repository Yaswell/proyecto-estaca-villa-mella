import React from "react";

function StatsCards({ stats }) {
  return (
    <div className="stats-cards">
      <div className="grid-4">
        <div className="card">
          <p className="metric-label">Total Conversos Último Año</p>
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
        <p className="metric-label">Promedio (días) para Sacerodio</p>
        <p className="metric-value">{stats.promedioDiasSacerdocio || 0}</p>
      </div>
    </div>
  );
}

export default StatsCards;
