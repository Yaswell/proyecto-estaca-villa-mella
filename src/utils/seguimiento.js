import { estimarDiasRecomendacion, parseFechaExacta, fechaConfirmacion, edadRegistrada, grupoDoce } from "./dataProcessor.js";

const DAY = 86400000;

export const columnas = {
  confirmacion: "Fecha de la confirmación",
  leccion: "Fecha de la lección posbautismal",
  recomendacion: "Fecha de expedición de la recomendación para el templo",
  envio: "Envió nombres al templo",
  visita: "Fecha de visita al templo",
};

export function primerNombre(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const comma = text.indexOf(",");
  if (comma >= 0) return text.slice(comma + 1).trim().split(/\s+/)[0];
  // Sin separador, un nombre compuesto no indica dónde comienzan los apellidos.
  return /\s/.test(text) ? "" : text;
}

export function diaExacto(value) {
  const date = parseFechaExacta(value);
  return date ? Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY : null;
}

export function hoyDominicano() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (key) => parts.find((p) => p.type === key).value;
  return diaExacto(`${part("year")}-${part("month")}-${part("day")}`);
}

function texto(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function datosSacerdocio(row, hoy = hoyDominicano()) {
  const ref = new Date(hoy * DAY);
  const fechaHoy = new Date(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  const { edad, edadAnio } = edadRegistrada(row, fechaHoy);
  const grupoEdadDoce = grupoDoce(row, fechaHoy);  if (!["v", "varon", "masculino", "hombre"].includes(texto(row.Sexo))) {
    return { edad, edadAnio, grupoEdadDoce, sacerdocio: null };
  }
  const tipo = texto(row.Sacerdocio);
  const oficio = texto(row["Oficio en el sacerdocio"]);
  const ordenacion = diaExacto(row["Fecha de la ordenación"]);
  const fechaValida = ordenacion !== null && ordenacion <= hoy;
  const negativo = [tipo, oficio].some((value) => ["no", "no ha sido ordenado"].includes(value));
  const positivo = ["aaronico", "melquisedec", "si"].includes(tipo) ||
    ["diacono", "maestro", "presbitero", "elder", "sumo sacerdote"].includes(oficio) || fechaValida;
  const estado = positivo && negativo ? "revisar" : positivo ? "si" : negativo ? "no" : "sin-dato";
  return { edad, edadAnio, grupoEdadDoce, sacerdocio: {
    estado, tipo: positivo ? row.Sacerdocio?.trim() : null,
    oficio: positivo ? row["Oficio en el sacerdocio"]?.trim() : null,
    ordenacion: fechaValida ? ordenacion : null,
  } };
}

const estadoBinario = (value) => {
  const normalized = texto(value);
  return normalized === "si" ? true : normalized === "no" ? false : null;
};
export function diaConfirmacion(row, hoy = hoyDominicano()) {
  const ref = new Date(hoy * DAY);
  const fecha = fechaConfirmacion(row, new Date(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  return fecha ? Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()) / DAY : null;
}

const desdeBase = (row, key, hoy, desdeConfirmacion = false) => {
  const start = desdeConfirmacion ? diaConfirmacion(row, hoy) : diaExacto(row["Fecha del bautismo"]);
  const end = key === columnas.confirmacion ? diaConfirmacion(row, hoy) : diaExacto(row[key]);
  return start !== null && end !== null && end >= start && end <= hoy ? end - start : null;
};

function avance(rows, status) {
  const statuses = rows.map(status);
  const count = statuses.filter((value) => value === true).length;
  const known = statuses.filter((value) => value !== null).length;
  return { count, known, total: rows.length, value: known ? count / rows.length * 100 : null };
}

function promedio(rows, key, hoy, desdeConfirmacion = false) {
  const values = rows.map((row) => desdeBase(row, key, hoy, desdeConfirmacion)).filter((value) => value !== null);
  return { count: values.length, total: rows.length, value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
}

function tiempoRecomendacion(rows, hoy, estado) {
  const referencia = new Date(hoy * DAY);
  const fechaHoy = new Date(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate());
  let suma = 0, exactos = 0, estimados = 0;
  for (const row of rows) {
    const exacto = desdeBase(row, columnas.recomendacion, hoy, true);
    if (exacto !== null) {
      suma += exacto;
      exactos++;
      continue;
    }
    if (String(row[columnas.recomendacion] ?? "").trim() || estado(row) !== true) continue;
    const estimado = estimarDiasRecomendacion(row, fechaHoy);
    if (estimado !== null) {
      suma += estimado;
      estimados++;
    }
  }
  const count = exactos + estimados;
  return { value: count ? suma / count : null, count, total: rows.length, exactos, estimados };
}

export function metricas(rows, hoy = hoyDominicano()) {
  const ref = new Date(hoy * DAY);
  const fechaHoy = new Date(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
  const ordenables = rows.filter((row) =>
    ["v", "varon", "masculino", "hombre"].includes(texto(row.Sexo)) && grupoDoce(row, fechaHoy) === true);
  const conEdad = rows.filter((row) => grupoDoce(row, fechaHoy) === true);
  const recomendacion = (row) => {
    const estado = texto(row["Estado de la recomendación para el templo"]);
    if (["activa", "vence el proximo mes"].includes(estado)) return true;
    if (["vencida", "inactiva", "sin recomendacion", "no tiene"].includes(estado)) return false;
    return null;
  };
  return {
    bautismos: rows.length,
    confirmaciones: promedio(rows, columnas.confirmacion, hoy),
    lecciones: promedio(rows, columnas.leccion, hoy),
    visitas: promedio(rows, columnas.visita, hoy, true),
    ordenacion: avance(ordenables, (row) => diaExacto(row["Fecha de la ordenación"]) !== null && diaExacto(row["Fecha de la ordenación"]) <= hoy ? true : null),
    diasOrdenacion: promedio(ordenables, "Fecha de la ordenación", hoy, true),
    recomendacion: avance(conEdad, recomendacion),
    diasRecomendacion: tiempoRecomendacion(rows, hoy, recomendacion),
    envio: avance(rows, (row) => estadoBinario(row[columnas.envio])),
  };
}

export const hitos = [
  { key: "ordenacion", label: "Ordenación", goal: 80, unit: "%" },
  { key: "diasOrdenacion", label: "Tiempo a ordenación", goal: 14, unit: "días" },
  { key: "recomendacion", label: "Recomendación para el templo", goal: 80, unit: "%" },
  { key: "diasRecomendacion", label: "Tiempo a recomendación", goal: 14, unit: "días" },
  { key: "envio", label: "Envío de nombres", goal: 50, unit: "%" },
];
