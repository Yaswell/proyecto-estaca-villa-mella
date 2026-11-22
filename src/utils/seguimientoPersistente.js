import { parseFechaExacta, grupoDoce } from "./dataProcessor.js";
import { sexoNormalizado } from "./filtrosDemograficos.js";

const normalizar = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().replace(/\s+/g," ").trim();
export function fechaIdentidad(value) {
  const date = parseFechaExacta(value);
  return date ? [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-") : null;
}
export function clavePersona(row) {
  const nombre = normalizar(row["Nombre completo"] || row["Nombre de preferencia"]);
  const unidad = normalizar(row.Unidad);
  const fecha = fechaIdentidad(row["Fecha de nacimiento"] || row["Fecha de nacimiento (1 ene 1990)"]);
  return nombre && fecha && unidad ? JSON.stringify([nombre,fecha,unidad]) : null;
}
export function combinarSeguimiento(rows, reportes) {
  const map = new Map();
  for(const row of reportes) {
    const key=clavePersona(row);
    if (key) map.set(key,map.has(key) ? null : row);
  }
  const counts=new Map();
  rows.forEach(row=>{const key=clavePersona(row);if(key)counts.set(key,(counts.get(key)||0)+1);});
  return rows.map(row=>{
    const key=clavePersona(row);
    const report=key && counts.get(key)===1 ? map.get(key) : null;
    if(!report)return row;
    const result={...row};
    for(const key of ["Fecha de la lección posbautismal","Fecha de entrevista significativa","Fecha de visita al templo",
      "Usó tarjeta de un familiar propio","Fecha de visita con tarjeta de familiar propio","Fecha de última actualización","Actualizado por"]) {
      if(String(report[key]??"").trim())result[key]=report[key];
    }
    return result;
  });
}
export function preparacionRegistrada(row, hoy) {
  const state=normalizar(row["Estado de la recomendación para el templo"]);
  if(!["activa","vence el proximo mes"].includes(state))return false;
  if(grupoDoce(row,hoy)!==true)return false;
  const sex=sexoNormalizado(row.Sexo);
  if(sex==="sin-dato")return false;
  if(sex==="M")return true;
  return ["aaronico","melquisedec"].includes(normalizar(row.Sacerdocio)) ||
    ["diacono","maestro","presbitero","elder","sumo sacerdote"].includes(normalizar(row["Oficio en el sacerdocio"]));
}
