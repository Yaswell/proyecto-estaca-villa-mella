export function TemploChart({ data }) {
  const items = [
    {
      label: "En edad de recomendación",
      value: data.totalEdad,
      color: "#3b82f6", // azul
    },
    {
      label: "Con recomendación",
      value: data.conRecomendacion,
      color: "#22c55e", // verde
    },
    {
      label: "Enviaron nombres",
      value: data.enviados,
      color: "#f59e0b", // amarillo
    },
  ];

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="card">
      <h3>Progreso hacia el Templo</h3>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-end" }}>
        {items.map((item, index) => {
          const height = (item.value / max) * 200;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
                {item.value === null ? "Sin dato" : item.value}
              </div>

              <div
                style={{
                  height: `${height}px`,
                  width: "60px",
                  backgroundColor: item.color,
                  borderRadius: "8px",
                  transition: "0.3s",
                }}
              />

              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: "12px",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
