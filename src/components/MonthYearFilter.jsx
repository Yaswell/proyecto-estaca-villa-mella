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

export default function MonthYearFilter({
  dateRange,
  setDateRange,
  monthOptions,
}) {
  const handleChange = (e, type) => {
    const [month, year] = e.target.value.split("-");
    const newDate = new Date(parseInt(year), parseInt(month));
    setDateRange((prev) => ({
      ...prev,
      [type]: newDate,
    }));
  };

  const formatValue = (month, year) => `${month}-${year}`;

  return (
    <div
      className="filtro-fechas"
      style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
    >
      <div>
        <label>Desde:</label>
        <br />
        <select
          value={formatValue(
            dateRange.start.getMonth(),
            dateRange.start.getFullYear()
          )}
          onChange={(e) => handleChange(e, "start")}
        >
          {monthOptions.map(({ month, year }) => (
            <option
              key={`start-${month}-${year}`}
              value={formatValue(month, year)}
            >
              {months[month]} {year}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Hasta:</label>
        <br />
        <select
          value={formatValue(
            dateRange.end.getMonth(),
            dateRange.end.getFullYear()
          )}
          onChange={(e) => handleChange(e, "end")}
        >
          {monthOptions.map(({ month, year }) => (
            <option
              key={`end-${month}-${year}`}
              value={formatValue(month, year)}
            >
              {months[month]} {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
