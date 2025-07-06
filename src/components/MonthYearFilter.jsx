import React from "react";

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

const years = [2023, 2024, 2025];

export default function MonthYearFilter({ dateRange, setDateRange }) {
  const handleChange = (e, type) => {
    const [month, year] = e.target.value.split("-");
    const newDate = new Date(parseInt(year), parseInt(month));
    setDateRange((prev) => ({
      ...prev,
      [type]: newDate,
    }));
  };
  const startYear = dateRange.start
    ? dateRange.start.getFullYear()
    : new Date().getFullYear();
  const endYear = dateRange.end
    ? dateRange.end.getFullYear()
    : new Date().getFullYear();

  const years = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  return (
    <div
      className="filtro-fechas"
      style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
    >
      <div>
        <label>Desde:</label>
        <br />
        <select
          value={`${dateRange.start.getMonth()}-${dateRange.start.getFullYear()}`}
          onChange={(e) => handleChange(e, "start")}
        >
          {years.map((year) =>
            months.map((_, i) => (
              <option key={`${i}-${year}`} value={`${i}-${year}`}>
                {months[i]} {year}
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label>Hasta:</label>
        <br />
        <select
          value={`${dateRange.end.getMonth()}-${dateRange.end.getFullYear()}`}
          onChange={(e) => handleChange(e, "end")}
        >
          {years.map((year) =>
            months.map((_, i) => (
              <option key={`${i}-${year}`} value={`${i}-${year}`}>
                {months[i]} {year}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
