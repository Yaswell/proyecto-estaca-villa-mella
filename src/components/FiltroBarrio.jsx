// filtroBarrio.jsx
import React from "react";

export function FiltroBarrio({
  barrios,
  barrioSeleccionado,
  setBarrioSeleccionado,
}) {
  return (
    <select
      id="sr-unidad"
      value={barrioSeleccionado}
      onChange={(e) => setBarrioSeleccionado(e.target.value)}
      style={{ padding: "6px 10px", borderRadius: "4px", fontSize: "1rem" }}
    >
      {barrios.map((barrio) => (
        <option key={barrio} value={barrio}>
          {barrio === "Estaca" ? "Toda la estaca" : barrio}
        </option>
      ))}
    </select>
  );
}
