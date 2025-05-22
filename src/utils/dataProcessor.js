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

  const tiempos = conRecomendacion
    .map((row, index) => {
      const fechaBautismo = parseFecha(row["Fecha del bautismo"]);
      if (!fechaBautismo || isNaN(fechaBautismo.getTime())) {
        console.log(
          `Fila ${index}: Fecha bautismo inválida -> ${row["Fecha del bautismo"]}`
        );
        return null;
      }

      const vencimientoRaw =
        row["Fecha de vencimiento de la recomendación para el templo"];
      if (!vencimientoRaw || vencimientoRaw.trim() === "") {
        console.log(`Fila ${index}: Sin fecha de vencimiento`);
        return null;
      }

      const fechaVencimiento = parseFecha(vencimientoRaw);
      if (!fechaVencimiento || isNaN(fechaVencimiento.getTime())) {
        console.log(
          `Fila ${index}: Fecha vencimiento inválida -> ${vencimientoRaw}`
        );
        return null;
      }

      // Restar 1 año para obtener fecha de expedición
      const fechaExpedicion = new Date(fechaVencimiento);
      fechaExpedicion.setFullYear(fechaExpedicion.getFullYear() - 1);

      // Calcular días desde bautismo hasta expedición
      const dias = (fechaExpedicion - fechaBautismo) / (1000 * 60 * 60 * 24);

      return dias > 0 ? dias : null;
    })
    .filter((d) => d !== null);

  const promedioDias =
    tiempos.length > 0
      ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
      : 0;

  console.log(`Total filas: ${total}`);
  console.log(
    `Filas con recomendación activa o vence próximo mes: ${conRecomendacion.length}`
  );
  console.log(`Con llamamiento: ${conLlamamiento}`);

  console.log(`Promedio días desde bautismo hasta expedición: ${promedioDias}`);

  return {
    total,
    conLlamamiento,
    conRecomendacion: conRecomendacion.length,
    promedioDias,
  };
}

function parseFecha(fechaStr) {
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
