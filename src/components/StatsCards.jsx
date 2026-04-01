import React from "react";
import { TemploChart } from "./TemploChart";

function StatsCards({
  stats,
  dateRange,
  handleHover,
  handleLeave,
  temploStats,
  hoverDetalle, // 👈 ahora viene por props
}) {
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

      <div className="grid-3">
        <TemploChart data={temploStats} />
      </div>
      <div className="grid-2">
        <div className="card">
          <p className="metric-label">Promedio (días) para Sacerdocio</p>
          <p className="metric-value">{stats.promedioDiasSacerdocio || 0}</p>
        </div>

        <div className="card">
          <p className="metric-label">Con ministrantes asignados</p>
          <p className="metric-value">{stats.conMinistrantes || 0}</p>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div
            className="relative group bg-white p-4 rounded-lg shadow-md hover:shadow-lg cursor-default"
            onMouseEnter={() =>
              handleHover("Conversos investidos", (data) =>
                data.filter((row) => {
                  const val = row["Está investido"]?.toLowerCase().trim();
                  return val === "sí" || val === "si";
                }),
              )
            }
            onMouseLeave={handleLeave}
          >
            <p className="text-sm text-gray-500">Conversos investidos</p>
            <p className="text-xl font-bold">{stats.totalInvestidos || 0}</p>

            {/* Tooltip */}
            {hoverDetalle?.titulo === "Conversos investidos" && (
              <div className="absolute z-50 top-full mt-2 left-0 w-64 bg-white border border-gray-200 rounded-md shadow-xl p-3 max-h-60 overflow-auto text-xs">
                <p className="font-semibold mb-1">{hoverDetalle.titulo}</p>
                <ul className="list-disc list-inside">
                  {hoverDetalle.personas.map((p, i) => (
                    <li key={i}>
                      {p["Nombre completo"] || "Sin nombre"} — {p["Unidad"]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <p className="metric-label">
            Conversos sellados al cónyuge {rangoTexto}
          </p>
          <p className="metric-value">{stats.totalSellados || 0}</p>
        </div>
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
