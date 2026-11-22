export function borradorMisional({ nombre, unidad, etapa, confirmacion }) {
  const persona = nombre === "Nombre por verificar" ? "[primer nombre]" : nombre;
  const barrio = unidad ? ` (${unidad})` : "";
  if (etapa === 0) {
    const confirmacionPendiente = confirmacion === null
      ? " Si ya se registró la confirmación, por favor avísennos." : "";
    return {
      destinatario: "Misioneros",
      texto: `Hola, misioneros. Recibimos el registro del bautismo de ${persona}${barrio}. ¿Podrían coordinar la lección posbautismal y avisarnos cuando se realice? Si necesitan apoyo, cuéntennos.${confirmacionPendiente} ¡Gracias!`,
    };
  }
  if (etapa === 1) {
    return {
      destinatario: "Obispado",
      texto: `Hola, obispo. Ya tenemos registrada la lección posbautismal de ${persona}${barrio}. ¿Podría coordinar una entrevista de seguimiento cuando sea oportuno y avisarnos si necesita apoyo? Gracias.`,
    };
  }
  if (etapa === 2) {
    return {
      destinatario: "Líder de templo e historia familiar",
      texto: `Hola. Estamos dando seguimiento a la preparación para el templo de ${persona}${barrio}. ¿Podría ponerse en contacto para ofrecer apoyo con historia familiar y, si la persona lo desea, ayudar a preparar una visita al templo? Gracias.`,
    };
  }
  return null;
}
