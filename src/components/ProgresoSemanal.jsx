import { useId, useState } from "react";
import { columnas, datosSacerdocio, diaConfirmacion, diaExacto, hoyDominicano, primerNombre } from "../utils/seguimiento.js";
import { preparacionRegistrada } from "../utils/seguimientoPersistente.js";
import { borradorMisional } from "../utils/borradorMisional.js";
import "./progreso-semanal.css";

const etapas = [
  { title: "Bautismo y confirmación", detail: "Último hito registrado: bautismo o confirmación", owners: "Misioneros" },
  { title: "Lección posbautismal realizada", detail: "Lección confirmada por el responsable", owners: "Misioneros · Líder de THF" },
  { title: "Entrevista / preparación confirmada", detail: "Entrevista registrada o recomendación y sacerdocio verificados", owners: "Obispado" },
  { title: "Visita al templo realizada", detail: "Visita confirmada por el responsable", owners: "Líder de THF" },
];
const dayMs = 86400000;
const fecha = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" });
const mostrarFecha = (day) => day === null ? "Sin fecha registrada" : fecha.format(new Date(day * dayMs));
const sinAcentos = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function clasificar(row, hoy) {
  const valor = row["Nombre de preferencia"]?.trim();
  if (!valor) return null;
  const nombre = primerNombre(valor) || "Nombre por verificar";
  const bautismo = diaExacto(row["Fecha del bautismo"]);
  if (bautismo !== null && bautismo > hoy) return null;
  const valid = (column) => {
    const day = diaExacto(row[column]);
    return day !== null && day <= hoy && (bautismo === null || day >= bautismo) ? day : null;
  };
  const confirmacion = diaConfirmacion(row, hoy);
  const leccion = valid(columnas.leccion);
  const posterior = (column) => {
    const day = valid(column);
    return confirmacion !== null && day !== null && day >= confirmacion ? day : null;
  };
  const entrevista = posterior("Fecha de entrevista significativa");
  const visita = posterior(columnas.visita);
  const recomendacion = posterior(columnas.recomendacion);
  const tarjeta = posterior("Fecha de visita con tarjeta de familiar propio");
  const conTarjeta = String(row["Usó tarjeta de un familiar propio"] || "").trim().toLowerCase() === "sí" && tarjeta !== null;
  const fechaHoy = new Date(new Date(hoy * dayMs).getUTCFullYear(), new Date(hoy * dayMs).getUTCMonth(), new Date(hoy * dayMs).getUTCDate());
  const preparada = confirmacion !== null && preparacionRegistrada(row, fechaHoy);
  const etapa = conTarjeta ? 4 : visita !== null ? 3 : preparada || entrevista !== null ? 2 : leccion !== null ? 1 : 0;
  const inicio = etapa === 0 ? bautismo : confirmacion;
  return {
    ...datosSacerdocio(row, hoy), nombre, unidad: row.Unidad?.trim(), etapa, bautismo, confirmacion, leccion, entrevista, visita, recomendacion, tarjeta, preparada,
    fechaFuente: row["Fecha del bautismo"],
    ultimaActualizacion: row["Fecha de última actualización"],
    espera: inicio == null ? null : hoy - inicio,
    viaje: tarjeta === null || confirmacion === null ? null : tarjeta - confirmacion,
  };
}

const estadoSacerdocio = { si: "Recibido", no: "No ha sido ordenado", revisar: "Por verificar", "sin-dato": "Sin dato" };

function DatosPersona({ persona }) {
  const { nombre, unidad, edad, sacerdocio, grupoEdadDoce, edadAnio } = persona;
  return <span className="ps-person-info">
    <strong>{nombre}</strong>
    <small>{edad === null ? "Edad sin dato" : `${edad} años`} · {unidad}</small>
    {sacerdocio && edad !== null && edad < 12 && grupoEdadDoce === true && <small>Grupo de edad: cumple {edadAnio} este año</small>}
    {sacerdocio && grupoEdadDoce === null && <small>Grupo de 12 años: falta verificar nacimiento</small>}
    {sacerdocio && <small className={`ps-priesthood ps-priesthood--${sacerdocio.estado}`}>
      Sacerdocio: {estadoSacerdocio[sacerdocio.estado]}
    </small>}
  </span>;
}

function BorradorWhatsApp({ persona }) {
  const [texto, setTexto] = useState(null);
  const [estado, setEstado] = useState("");
  const id = useId();
  const borrador = borradorMisional(persona);
  if (!borrador) return null;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto.trim());
      setEstado("Copiado. Pégalo en el chat del responsable en WhatsApp.");
    } catch {
      setEstado("No se pudo copiar automáticamente. Selecciona y copia el texto.");
    }
  }
  return <div className="ps-whatsapp">
    {texto === null ? (
      <button type="button" onClick={() => setTexto(borrador.texto)}>Preparar WhatsApp</button>
    ) : <>
      <p>Para: <strong>{borrador.destinatario}</strong></p>
      <label htmlFor={id}>Mensaje editable</label>
      <textarea id={id} rows={5} value={texto} onChange={(event) => {
        setTexto(event.target.value);
        setEstado("");
      }} />
      <button type="button" disabled={!texto.trim()} onClick={copiar}>Copiar mensaje</button>
      <p role="status">{estado || "Revisa el texto y el destinatario antes de enviarlo."}</p>
    </>}
  </div>;
}

function Tarjeta({ persona }) {
  const { fechaFuente, espera, bautismo, confirmacion, leccion, entrevista, recomendacion, sacerdocio } = persona;
  return (
    <li>
      <details className="ps-person">
        <summary>
          <DatosPersona persona={persona} />
          <span className={`ps-age${espera !== null && espera >= 14 ? " ps-age--long" : ""}`}>
            {espera === null ? "Sin fecha" : espera < 7 ? `${espera} d` : `${Math.floor(espera / 7)} sem`}
          </span>
        </summary>
        <dl>
          <dt>Bautismo</dt><dd>{bautismo === null ? fechaFuente : mostrarFecha(bautismo)}</dd>
          <dt>Confirmación</dt><dd>{mostrarFecha(confirmacion)}</dd>
          <dt>Lección</dt><dd>{mostrarFecha(leccion)}</dd>
          <dt>Entrevista</dt><dd>{mostrarFecha(entrevista)}</dd>
          <dt>Expedición de recomendación</dt><dd>{mostrarFecha(recomendacion)}</dd>
          {sacerdocio?.estado === "si" && <>
            {sacerdocio.tipo && <><dt>Tipo de sacerdocio</dt><dd>{sacerdocio.tipo}</dd></>}
            {sacerdocio.oficio && <><dt>Oficio</dt><dd>{sacerdocio.oficio}</dd></>}
            <dt>Ordenación</dt><dd>{mostrarFecha(sacerdocio.ordenacion)}</dd>
          </>}
        </dl>
        {persona.preparada && persona.entrevista === null && <p className="ps-empty">Preparación según el sistema; entrevista sin fecha confirmada.</p>}
        {persona.ultimaActualizacion && <p className="ps-empty">Último reporte: {persona.ultimaActualizacion}</p>}
        <BorradorWhatsApp key={`${persona.nombre}|${persona.unidad}|${persona.etapa}`} persona={persona} />
      </details>
    </li>
  );
}

export default function ProgresoSemanal({ rows, unidad }) {
  const [busqueda, setBusqueda] = useState("");
  const hoy = hoyDominicano();
  const weekStart = hoy - ((new Date(hoy * dayMs).getUTCDay() + 6) % 7);
  const grupos = [[], [], [], [], []];
  rows.forEach((row, i) => {
    if (unidad !== "Estaca" && row.Unidad?.trim() !== unidad) return;
    const persona = clasificar(row, hoy);
    if (persona && sinAcentos(persona.nombre).includes(sinAcentos(busqueda.trim()))) {
      grupos[persona.etapa].push({ ...persona, key: i });
    }
  });
  grupos.forEach((group) => group.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
  return (
    <section className="ps-board" aria-labelledby="ps-title">
      <header className="sr-header ps-header">
        <p className="sr-kicker">ESTACA VILLA MELLA</p>
        <h1 id="ps-title">Progreso semanal <span>· Reunión de seguimiento</span></h1>
        <p><strong>Unidad:</strong> {unidad === "Estaca" ? "Toda la estaca" : unidad} <span>·</span> <strong>Semana del:</strong> {mostrarFecha(weekStart)}</p>
      </header>
      <div className="ps-tools">
        <label htmlFor="ps-busqueda">Buscar por primer nombre</label>
        <input id="ps-busqueda" type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} />
        <small>Abre una tarjeta para ver sus fechas. La insignia cuenta desde la confirmación para el seguimiento posterior; antes de confirmar, desde el bautismo.</small>
      </div>
      <div className="ps-grid">
        {etapas.map(({ title, detail, owners }, i) => (
          <section className={`ps-column ps-column--${i}`} key={title} aria-label={title}>
            <header><h2>{i + 1}. {title}</h2><p>{detail}</p><small>{grupos[i].length} en seguimiento</small></header>
            {grupos[i].length ? <ul>{grupos[i].map(persona => <Tarjeta key={persona.key} persona={persona} />)}</ul> : <p className="ps-empty">Sin registros en esta etapa.</p>}
            <footer>{owners}</footer>
          </section>
        ))}
        <section className="ps-column ps-completed" aria-label="Visita con tarjeta de familiar propio">
          <header><h2>Visita con tarjeta de familiar propio</h2><p>Tiempo desde la confirmación hasta la visita</p></header>
          {grupos[4].length ? <ul>{grupos[4].map(persona => (
            <li className="ps-visit" key={persona.key}><DatosPersona persona={persona} />
              <span><small>{mostrarFecha(persona.tarjeta)}</small><b>{persona.viaje === null ? "Sin tiempo exacto" : `${persona.viaje} días · ${new Intl.NumberFormat("es-DO", { maximumFractionDigits: 1 }).format(persona.viaje / 7)} sem.`}</b></span></li>
          ))}</ul> : <p className="ps-empty">No hay visitas con tarjeta familiar confirmadas en esta selección.</p>}
        </section>
      </div>
      <p className="ps-callout"><strong>Deliberar y actuar</strong> ¿Quién necesita ayuda? · ¿Cuál es su próximo paso? · ¿Quién lo hará? · ¿Cuándo?</p>
      <p className="sr-note">Las etapas se basan en fechas registradas. Una fecha ausente no significa que el hito no haya ocurrido. La recomendación o la ordenación por sí solas no confirman una entrevista ni una visita.</p>
    </section>
  );
}
