export const TempleChart = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-md">
      <h2 className="text-xl font-semibold mb-2">Resumen de Recomendaciones</h2>
      <p>
        Total con recomendación activa: <strong>{data.activeCount}</strong>
      </p>
      <p>
        Promedio de días entre bautismo y recomendación:{" "}
        <strong>{data.averageDays}</strong>
      </p>
    </div>
  );
};
