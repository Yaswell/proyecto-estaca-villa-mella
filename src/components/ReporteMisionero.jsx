import "./seguimiento.css";

const config = import.meta.env.VITE_REPORTE_MISIONERO_URL ||
  "https://script.google.com/macros/s/AKfycbwiz3ey_9tQZfK0rl7t8gM3ZzuFAzWeFwz_38fQT5cswIcfvYk8kr5lXBtlHI5cG-hv9g/exec";

function reportUrl() {
  try {
    const url = new URL(config);
    return url.origin === "https://script.google.com" && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname)
      ? url.href : null;
  } catch {
    return null;
  }
}

export default function ReporteMisionero({ demoUrl }) {
  const url = reportUrl();
  return (
    <section aria-labelledby="reporte-title">
      <header className="sr-header">
        <p className="sr-kicker">CONVERSOS RECIENTES · VILLA MELLA</p>
        <h1 id="reporte-title">Senda de los convenios</h1>
        <p>Registra las acciones de acompañamiento realizadas en tu barrio o rama.</p>
      </header>
      <div className="sr-card sr-report">
        <h2>Registrar un seguimiento</h2>
        <ol>
          <li>Selecciona tu barrio o rama.</li>
          <li>Elige al miembro nuevo. La lista muestra el primer nombre.</li>
          <li>Selecciona la acción y la fecha, y envía el reporte.</li>
        </ol>
        {demoUrl ? <a className="sr-button" href={demoUrl}>Abrir formulario de prueba</a> : url ? <a className="sr-button" href={url} target="_blank" rel="noopener noreferrer">Abrir formulario de la senda</a>
          : <p role="status">El formulario estará disponible cuando se conecte a la hoja de reportes.</p>}
      </div>
    </section>
  );
}
