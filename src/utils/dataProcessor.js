export function filterByDateRange(data, dateRange) {
  if (!dateRange.start || !dateRange.end) return data; // sin filtro

  return data.filter((row) => {
    const fechaBautismo = parseFecha(row["Fecha del bautismo"]);
    if (!fechaBautismo || isNaN(fechaBautismo.getTime())) return false;
    return fechaBautismo >= dateRange.start && fechaBautismo <= dateRange.end;
  });
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
    const edad = parseInt(row["Edad"]);
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

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  const tiempos = conRecomendacion
    .map((row) => {
      const fechaBautismo = parseFecha(row["Fecha del bautismo"]);
      const vencimientoRaw =
        row["Fecha de vencimiento de la recomendación para el templo"];

      if (
        !fechaBautismo ||
        isNaN(fechaBautismo.getTime()) ||
        !vencimientoRaw ||
        vencimientoRaw.trim() === ""
      ) {
        return null;
      }

      const fechaVencimiento = parseFecha(vencimientoRaw);
      if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) {
        return null;
      }

      const añoVencimiento = fechaVencimiento.getFullYear();
      const mesVencimiento = fechaVencimiento.getMonth();

      const mesExpedicion = new Date(añoVencimiento - 1, mesVencimiento, 1); // asumes día 1 del mes
      const esMesEnCurso =
        fechaBautismo.getMonth() === mesActual &&
        fechaBautismo.getFullYear() === anioActual;

      if (esMesEnCurso) {
        return 10; // estimado conservador
      }

      const dias = (mesExpedicion - fechaBautismo) / (1000 * 60 * 60 * 24);
      return dias > 0 ? dias : null;
    })
    .filter((d) => d !== null);
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

export function parseFecha(fechaStr) {
  // Soporta formatos "dd-mm-yyyy" y "mm-yyyy"
  let regexDMY = /^(\d{2})-(\d{2})-(\d{4})$/; // dd-mm-yyyy
  let regexMY = /^(\d{2})-(\d{4})$/; // mm-yyyy

  let matchDMY = fechaStr.match(regexDMY);
  if (matchDMY) {
    let dia = parseInt(matchDMY[1], 10);
    let mes = parseInt(matchDMY[2], 10);
    let año = parseInt(matchDMY[3], 10);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return new Date(año, mes - 1, dia);
  }

  let matchMY = fechaStr.match(regexMY);
  if (matchMY) {
    let mes = parseInt(matchMY[1], 10);
    let año = parseInt(matchMY[2], 10);
    if (mes < 1 || mes > 12) return null;
    return new Date(año, mes - 1, 1); // Primer día del mes
  }

  return null; // Formato no reconocido
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
    .map((row, index) => {
      const fechaBautismo = parseFecha(row["Fecha del bautismo"]);
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
      return dias > 0 ? dias : null;
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
  const enEdad = data.filter((row) => {
    const edad = parseInt(row["Edad"]);
    return !isNaN(edad) && edad >= 11;
  });

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
