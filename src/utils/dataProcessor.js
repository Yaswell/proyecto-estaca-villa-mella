export function filterByDateRange(data, dateRange) {
  if (!dateRange.start || !dateRange.end) return data; // sin filtro

  return data.filter((row) => {
    const fechaBautismo = parseFecha(row["Fecha del bautismo"]);
    if (!fechaBautismo || isNaN(fechaBautismo.getTime())) return false;
    return fechaBautismo >= dateRange.start && fechaBautismo <= dateRange.end;
  });
}

export function fechaConfirmacion(row, hoy = new Date()) {
  const principal = String(row["Fecha de la confirmación"] ?? "").trim();
  const fecha = parseFechaExacta(principal || row["Fecha de confirmación"]);
  const bautismo = parseFechaExacta(row["Fecha del bautismo"]);
  if (!fecha || fecha > hoy || (bautismo && fecha < bautismo)) return null;
  return fecha;
}

// Método del reporte inicial, contando ahora desde la confirmación.
export function estimarDiasRecomendacion(row, hoy = new Date()) {
  const confirmacion = fechaConfirmacion(row, hoy);
  const vencimiento = parseFecha(row["Fecha de vencimiento de la recomendación para el templo"]);
  if (!confirmacion) return null;
  const ordinal = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  const real = parseFechaExacta(row["Fecha de expedición de la recomendación para el templo"]);
  if (real) {
    return real >= confirmacion && real <= hoy ? ordinal(real) - ordinal(confirmacion) : null;
  }
  if (String(row["Fecha de expedición de la recomendación para el templo"] ?? "").trim()) return null;
  if (!vencimiento) return null;
  if (confirmacion.getMonth() === hoy.getMonth() && confirmacion.getFullYear() === hoy.getFullYear()) return 10;
  const expedicion = new Date(vencimiento.getFullYear() - 1, vencimiento.getMonth(), 1);
  const dias = ordinal(expedicion) - ordinal(confirmacion);
  return dias >= 0 && expedicion <= hoy ? dias : null;
}

export function calculateStats(data) {
  const total = data.length;

  const conLlamamiento = data.filter((row) => {
    const llamamiento = row["Llamamientos con fecha de sostenimiento"];
    return llamamiento && llamamiento.trim() !== "";
  }).length;

  const conRecomendacion = data.filter((row) => {
    const estado = row["Estado de la recomendación para el templo"];
    return (
      estado &&
      (estado.trim().toLowerCase() === "activa" ||
        estado.trim().toLowerCase() === "vence el próximo mes")
    );
  });

  // 👇 Clasificación por edad y estado civil
  const clasificacionEdad = {
    jovenes: 0, // 11-17
    jas: 0, // 18-30 y no casado
    adultos: 0, // 18-30 y casado, o 31+
  };

  conRecomendacion.forEach((row) => {
    const edad = edadRegistrada(row).edad;
    const casado = row["Está casado"]?.trim().toLowerCase() === "sí";

    if (!isNaN(edad)) {
      if (edad >= 11 && edad <= 17) {
        clasificacionEdad.jovenes++;
      } else if (edad >= 18 && edad <= 30) {
        if (casado) clasificacionEdad.adultos++;
        else clasificacionEdad.jas++;
      } else if (edad >= 31) {
        clasificacionEdad.adultos++;
      }
    }
  });

  const tiempos = conRecomendacion
    .map((row) => estimarDiasRecomendacion(row))
    .filter((dias) => dias !== null);
  const promedioDias =
    tiempos.length > 0
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
      : 0;
  const conMinistrantes = data.filter((row) => {
    const hnos = row["Tiene hermanos ministrantes"]?.trim().toLowerCase();
    const hnas = row["Tiene hermanas ministrantes"]?.trim().toLowerCase();
    return hnos === "sí" || hnos === "si" || hnas === "sí" || hnas === "si";
  }).length;
  const totalInvestidos = data.filter((row) => {
    const valor = row["Está investido"]?.trim().toLowerCase();
    return valor === "sí" || valor === "si";
  }).length;

  const totalSellados = data.filter((row) => {
    const valor = row["Está sellado al cónyuge"]?.trim().toLowerCase();
    return valor === "sí" || valor === "si";
  }).length;

  return {
    total,
    conLlamamiento,
    conRecomendacion: conRecomendacion.length,
    promedioDias,
    promedioDiasSacerdocio: promedioDiasSacerdocio(data),
    conMinistrantes,
    clasificacionEdad,
    totalInvestidos,
    totalSellados,
  };
}

export function parseFechaExacta(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const numeric = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  const written = /^(\d{1,2})\s+(?:de\s+)?([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/i.exec(text);
  const months = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const [year, month, day] = (iso ? iso.slice(1) : numeric ? [numeric[3], numeric[2], numeric[1]]
    : written ? [written[3], months[written[2].toLowerCase().slice(0, 3)], written[1]] : []).map(Number);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function parseFecha(value) {
  const exact = parseFechaExacta(value);
  if (exact) return exact;
  const match = typeof value === "string" && /^(\d{2})[-/](\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? new Date(Number(match[2]), month - 1, 1) : null;
}

export function edadRegistrada(row, hoy = new Date()) {
  const principal = String(row["Fecha de nacimiento"] ?? "").trim();
  const raw = principal || row["Fecha de nacimiento (1 ene 1990)"];
  const nacimiento = parseFechaExacta(raw);
  if (nacimiento && nacimiento <= hoy) {
    const edadAnio = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumple = hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    return { edad: edadAnio - Number(aunNoCumple), edadAnio, tieneNacimiento: true };
  }
  // Si existe una fecha inválida no se deduce la edad a partir de ella.
  const fallback = String(row.Edad ?? "").trim();
  const edad = /^\d+$/.test(fallback) ? Number(fallback) : null;
  return { edad, edadAnio: null, tieneNacimiento: false };
}

export function grupoDoce(row, hoy = new Date()) {
  const { edad, edadAnio } = edadRegistrada(row, hoy);
  if (edadAnio !== null) return edadAnio >= 12;
  if (edad === null || edad === 11) return null;
  return edad >= 12;
}

export function groupByAge(data) {
  const counts = {};

  data.forEach((row) => {
    const edadStr = row["Edad"];
    if (!edadStr) return;

    const edad = parseInt(edadStr);
    if (isNaN(edad)) return;

    counts[edad] = (counts[edad] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([edad, cantidad]) => ({ edad: parseInt(edad), cantidad }))
    .sort((a, b) => a.edad - b.edad);
}

export function groupByUnit(data) {
  const counts = {};

  data.forEach((row) => {
    const unidad = row["Unidad"];
    if (!unidad) return;

    counts[unidad] = (counts[unidad] || 0) + 1;
  });

  return Object.entries(counts).map(([unidad, cantidad]) => ({
    unidad,
    cantidad,
  }));
}
export function promedioDiasSacerdocio(data) {
  const tiemposSacerdocio = data
    .map((row) => {
      const fechaBautismo = fechaConfirmacion(row);
      const fechaSacerdocio = parseFecha(row["Fecha de la ordenación"]);
      if (
        !fechaBautismo ||
        isNaN(fechaBautismo.getTime()) ||
        !fechaSacerdocio ||
        isNaN(fechaSacerdocio.getTime())
      ) {
        return null;
      }
      const dias = (fechaSacerdocio - fechaBautismo) / (1000 * 60 * 60 * 24);
      return dias >= 0 && fechaSacerdocio <= new Date() ? dias : null;
    })
    .filter((d) => d !== null);

  return tiemposSacerdocio.length > 0
    ? Math.round(
        tiemposSacerdocio.reduce((a, b) => a + b, 0) / tiemposSacerdocio.length,
      )
    : 0;
}

export function groupByAgeSex(data) {
  const counts = {};

  data.forEach((row) => {
    const edadStr = row["Edad"];
    const sexo = row["Sexo"] || "Desconocido";
    if (!edadStr) return;

    const edad = parseInt(edadStr);
    if (isNaN(edad)) return;

    const key = `${edad}_${sexo}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts).map(([key, cantidad]) => {
    const [edad, sexo] = key.split("_");
    return {
      edad: parseInt(edad),
      sexo,
      cantidad,
    };
  });
}
export function calcularIndicadoresTemplo(
  data,
  historiaData,
  barrioSeleccionado,
) {
  // 1. Edad de recomendación (11+)
  const enEdad = data.filter((row) => grupoDoce(row) === true);

  // 2. Con recomendación
  const conRecomendacion = enEdad.filter((row) => {
    const estado = row["Estado de la recomendación para el templo"];
    return (
      estado &&
      (estado.trim().toLowerCase() === "activa" ||
        estado.trim().toLowerCase() === "vence el próximo mes")
    );
  });

  // 3. Historia familiar (por unidad)
  let enviados = 0;

  if (barrioSeleccionado === "Estaca") {
    const estaca = historiaData.find((h) => h.unidad === "Estaca");
    enviados = estaca?.enviados || 0;
  } else {
    const unidad = historiaData.find(
      (h) => h.unidad.trim() === barrioSeleccionado,
    );
    enviados = unidad?.enviados || 0;
  }

  return {
    totalEdad: enEdad.length,
    conRecomendacion: conRecomendacion.length,
    enviados,
  };
}
