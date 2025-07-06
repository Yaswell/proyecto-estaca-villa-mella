import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const UnitChart = ({ data }) => {
  return (
    <div className="card" align="start">
      <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>
        Conversos por Unidad (Barrio o Rama)
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 80, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            dataKey="unidad" // corregido aquí
            type="category"
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="cantidad" fill="#38bdf8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
