import { edadRegistrada } from "./dataProcessor.js";

export function sexoNormalizado(value) {
  const text = String(value ?? "").trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (["v", "varon", "masculino", "hombre"].includes(text)) return "V";
  if (["m", "f", "mujer", "femenino"].includes(text)) return "M";
  return "sin-dato";
}

export function filtrarDemografia(rows, { sexo = "todos", edadMin = "", edadMax = "" }) {
  return rows.filter(row => {
    if (sexo !== "todos" && sexoNormalizado(row.Sexo) !== sexo) return false;
    if (edadMin === "" && edadMax === "") return true;
    const edad = edadRegistrada(row).edad;
    if (edad === null) return false;
    return (edadMin === "" || Number(edad) >= Number(edadMin)) &&
      (edadMax === "" || Number(edad) <= Number(edadMax));
  });
}
