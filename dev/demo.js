import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { columnas, diaExacto, hoyDominicano } from "../src/utils/seguimiento.js";

const unidadA = "Barrio de prueba A";
const unidadB = "Barrio de prueba B";
const unidades = [unidadA, unidadB];
const date = (day) => new Date(day * 86400000).toISOString().slice(0, 10);

export default function demo() {
  const hoy = hoyDominicano();
  const make = (nombre, unidad, days, sexo, extra = {}) => ({
    "Nombre de preferencia": nombre, "Fecha de nacimiento": "2004-12-15",
    Unidad: unidad, "Fecha del bautismo": date(hoy - days), Edad: "22", Sexo: sexo,
    [columnas.confirmacion]: date(hoy - days + 1),
    [columnas.leccion]: "", "Fecha de la ordenación": "",
    "Estado de la recomendación para el templo": "No tiene",
    [columnas.recomendacion]: "", [columnas.envio]: "No", [columnas.visita]: "",
    ...extra,
  });
  const rows = [
    make("Ana", unidadA, 28, "M"),
    make("Luis", unidadA, 27, "V", {
      "Fecha de la ordenación": date(hoy - 20),
      "Estado de la recomendación para el templo": "Activa",
      [columnas.recomendacion]: date(hoy - 13), [columnas.envio]: "Sí",
      [columnas.visita]: date(hoy - 10),
    }),
    make("Marta", unidadB, 23, "M"),
  ];
  const reportes = new Map();
  const form = new URL("../apps-script/Formulario.html", import.meta.url);
  const actions = new Map([
    ["Lección posbautismal",columnas.leccion],["Entrevista significativa","Fecha de entrevista significativa"],
    ["Visita al templo",columnas.visita],["Visita con tarjeta de familiar propio","Fecha de visita con tarjeta de familiar propio"],
  ]);
  return {
    name: "prueba-local-conversos",
    configureServer(server) {
      const base = server.config.base;
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        const send = (type, body, status = 200) => {
          res.writeHead(status, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-store" });
          res.end(body);
        };
        if (path === base + "__demo/conversos.csv") return send("text/csv", Papa.unparse(rows));
        if (path === base + "__demo/seguimiento.csv") return send("text/csv", Papa.unparse({
          fields:["Nombre completo","Fecha de nacimiento","Unidad","Fecha de la lección posbautismal","Fecha de entrevista significativa",
            "Fecha de visita al templo","Usó tarjeta de un familiar propio","Fecha de visita con tarjeta de familiar propio","Fecha de última actualización","Actualizado por"],
          data:[...reportes.values()].map(row=>[row["Nombre completo"],row["Fecha de nacimiento"],row.Unidad,row[columnas.leccion]||"",
            row["Fecha de entrevista significativa"]||"",row[columnas.visita]||"",row["Usó tarjeta de un familiar propio"]||"",
            row["Fecha de visita con tarjeta de familiar propio"]||"",row["Fecha de última actualización"]||"",row["Actualizado por"]||""]),
        }));
        if (path === base + "__demo/historia.csv") return send("text/csv", "Unidad,Miembros nuevos\nEstaca,1/3");
        if (path === base + "__demo/formulario") {
          const bridge = `<script>
            window.google = { script: { get run() {
              let success = () => {}, failure = () => {};
              const call = (method, ...args) => fetch(${JSON.stringify(base + "__demo/rpc")}, {
                method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({method,args})
              }).then(async r => { const value=await r.json(); if (!r.ok) throw new Error(value.error); return value; }).then(success,failure);
              return {withSuccessHandler(fn){success=fn;return this;}, withFailureHandler(fn){failure=fn;return this;},
                unidades:()=>call("unidades"), conversos:(...args)=>call("conversos",...args), guardarReporte:(data)=>call("guardarReporte",data)};
            } } };
          </script>`;
          return send("text/html", readFileSync(form, "utf8")
            .replace("<main>", `<main><p><strong>Modo de prueba.</strong> <a href="${base}?demo=1#seguimiento">Volver al tablero de prueba</a></p>`)
            .replace("</head>", bridge + "</head>"));
        }
        if (path !== base + "__demo/rpc" || req.method !== "POST") return next();
        try {
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 8192) throw new Error("Reporte demasiado grande.");
          }
          const { method, args } = JSON.parse(body);
          const json = (value) => send("application/json", JSON.stringify(value));
          if (method === "unidades") return json(unidades);
          if (!["conversos", "guardarReporte"].includes(method)) throw new Error("Acción no disponible.");
          const [input] = args;
          const unidad = method === "conversos" ? input : input.unidad;
          if (!unidades.includes(unidad)) throw new Error("Selecciona una unidad válida.");
          if (method === "conversos") return json(rows.filter(row => row.Unidad === unidad).map(row => ({
            token: "prueba-" + rows.indexOf(row), nombre: row["Nombre de preferencia"], bautismo: row["Fecha del bautismo"],
            hechos: [...actions].flatMap(([accion,key])=>{
              const saved=reportes.get(rows.indexOf(row));
              return saved?.[key] ? [{accion,fecha:saved[key]}] : [];
            }),
          })));
          const index = rows.findIndex((row,i) => row.Unidad === unidad && "prueba-" + i === input.token);
          const row=rows[index];
          const dia = diaExacto(input.fecha);
          if (!row || !actions.has(input.accion) || typeof input.responsable !== "string" || input.responsable.trim().length<2 ||
            dia === null || dia < diaExacto(row["Fecha del bautismo"]) || dia > hoyDominicano()) throw new Error("Revisa los datos del reporte.");
          if(input.accion !== "Lección posbautismal" && dia < diaExacto(row[columnas.confirmacion])) throw new Error("La acción requiere confirmación.");
          const key=actions.get(input.accion);
          const previous=reportes.get(index) || {
            "Nombre completo":row["Nombre de preferencia"], "Fecha de nacimiento":row["Fecha de nacimiento"], Unidad:row.Unidad,
          };
          if(previous[key] && previous[key]!==input.fecha)throw new Error("Ya hay otra fecha registrada para esta acción.");
          if(previous[key]===input.fecha)return json({guardado:true,yaRegistrado:true});
          previous[key]=input.fecha;
          previous["Fecha de última actualización"]=new Date().toISOString();
          previous["Actualizado por"]=input.responsable+" · "+input.rol;
          if(input.accion==="Visita con tarjeta de familiar propio") {
            if(previous[columnas.visita] && input.fecha<previous[columnas.visita])throw new Error("Revisa la fecha de la visita.");
            previous["Usó tarjeta de un familiar propio"]="Sí";
            previous[columnas.visita] ||= input.fecha;
          }
          reportes.set(index,previous);
          return json({ guardado: true });
        } catch (error) {
          return send("application/json", JSON.stringify({ error: error.message }), 400);
        }
      });
    },
  };
}
