import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const AgeChart = ({ data, title = "Conversos por Edad" }) => {
  // data = [{ edad: 18, sexo: "F", cantidad: 2 }, { edad: 18, sexo: "M", cantidad: 3 }, ...]

  // Para formato de chart, crear estructura con edades únicas y cantidades separadas por sexo
  const edadesUnicas = [...new Set(data.map((d) => d.edad))].sort(
    (a, b) => a - b
  );
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            padding: "8px",
          }}
        >
          <p>
            <strong>{label} años</strong>
          </p>
          <p>👨 Masculino: {payload[0]?.value}</p>
          <p>👩 Femenino: {payload[1]?.value}</p>
        </div>
      );
    }

    return null;
  };

  // Map para sumar cantidades de cada sexo por edad
  const chartData = edadesUnicas.map((edad) => {
    const cantidadM = data
      .filter((d) => d.edad === edad && d.sexo === "M")
      .reduce((a, b) => a + b.cantidad, 0);
    const cantidadV = data
      .filter((d) => d.edad === edad && d.sexo === "V")
      .reduce((a, b) => a + b.cantidad, 0);
    return {
      edad,
      Femenino: cantidadM,
      Masculino: cantidadV,
    };
  });

  return (
    <div className="card">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <XAxis dataKey="edad" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Femenino" stackId="a" fill="#f87171" />
          <Bar dataKey="Masculino" stackId="a" fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
