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
    const newDate = type === "end"
      ? new Date(Number(year), Number(month) + 1, 0)
      : new Date(Number(year), Number(month), 1);
    setDateRange((prev) => {
      if (type === "start" && newDate > prev.end) {
        return { start: newDate, end: new Date(Number(year), Number(month) + 1, 0) };
      }
      if (type === "end" && newDate < prev.start) {
        return { start: new Date(Number(year), Number(month), 1), end: newDate };
      }
      return { ...prev, [type]: newDate };
    });
  };

  const formatValue = (month, year) => `${month}-${year}`;

  return (
    <div className="sr-date-fields">
      <div className="sr-field">
        <label htmlFor="sr-desde">Bautismos desde</label>
        <select id="sr-desde"
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
      <div className="sr-field">
        <label htmlFor="sr-hasta">Bautismos hasta</label>
        <select id="sr-hasta"
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
