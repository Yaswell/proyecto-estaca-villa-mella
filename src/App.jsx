import { lazy, Suspense, useEffect, useState } from "react";
import MonthYearFilter from "./components/MonthYearFilter";
import StatsCards from "./components/StatsCards";
import { AgeChart } from "./components/AgeChart";
import { UnitChart } from "./components/UnitChart";
import { FiltroBarrio } from "./components/FiltroBarrio";
import Seguimiento from "./components/Seguimiento.jsx";
import ReporteMisionero from "./components/ReporteMisionero.jsx";
import Papa from "papaparse";

import {
  calculateStats,
  edadRegistrada,
  groupByUnit,
  groupByAgeSex,
  parseFecha,
  filterByDateRange,
  calcularIndicadoresTemplo,
} from "./utils/dataProcessor";

import { hoyDominicano } from "./utils/seguimiento.js";
import { combinarSeguimiento } from "./utils/seguimientoPersistente.js";
import { filtrarDemografia } from "./utils/filtrosDemograficos.js";
import "./index.css";

const SHEET_URL = import.meta.env.VITE_CONVERSOS_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/export?format=csv&gid=0";

const HISTORIA_FAMILIAR_URL = import.meta.env.VITE_HISTORIA_FAMILIAR_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/gviz/tq?tqx=out:csv&gid=512269246";

const SEGUIMIENTO_URL = import.meta.env.VITE_SEGUIMIENTO_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/export?format=csv&gid=112786024";

const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1";
const demoBase = import.meta.env.BASE_URL + "__demo/";

const local = import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
const ProgresoSemanal = local ? lazy(() => import("./components/ProgresoSemanal.jsx")) : null;
const vistas = { resumen: "Resumen", seguimiento: "Seguimiento y metas",
  ...(local ? { semanal: "Progreso semanal" } : {}), reporte: "Senda de los convenios" };
const vistaActual = () => Object.hasOwn(vistas, window.location.hash.slice(1)) ? window.location.hash.slice(1) : "resumen";

function mesActual() {
  const hoy = new Date(hoyDominicano() * 86400000);
  return {
    start: new Date(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1),
    end: new Date(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 0),
  };
}

function App() {
  const [vista, setVista] = useState(vistaActual);
  const [estadoCarga, setEstadoCarga] = useState("cargando");
  const [revision, setRevision] = useState(0);
  const [lectura, setLectura] = useState(null);
  const [ultimaLectura, setUltimaLectura] = useState(null);
  useEffect(() => {
    const cambiar = () => setVista(vistaActual());
    window.addEventListener("hashchange", cambiar);
    return () => window.removeEventListener("hashchange", cambiar);
  }, []);
  const [dateRange, setDateRange] = useState(mesActual);
  const [data, setData] = useState([]);
  const [seguimientoData, setSeguimientoData] = useState([]);
  const [errorSeguimiento, setErrorSeguimiento] = useState(false);
  const [historiaFamiliarData, setHistoriaFamiliarData] = useState([]); // 👈 NUEVO

  const [temploStats, setTemploStats] = useState({
    totalEdad: 0,
    conRecomendacion: 0,
    enviados: 0,
  });

  const [stats, setStats] = useState({
    total: 0,
    conRecomendacion: 0,
    promedioDias: 0,
    conLlamamiento: 0,
    promedioDiasSacerdocio: 0,
    conMinistrantes: 0,
    clasificacionEdad: { jovenes: 0, jas: 0, adultos: 0 },
    totalInvestidos: 0,
    totalSellados: 0,
  });

  const [ageSexData, setAgeSexData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [barrioSeleccionado, setBarrioSeleccionado] = useState("Estaca");
  const [listaBarrios, setListaBarrios] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  const [sexo, setSexo] = useState("todos");
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");
  const filtrosDemograficos = sexo !== "todos" || edadMin !== "" || edadMax !== "";
  const rangoInvalido = edadMin !== "" && edadMax !== "" && Number(edadMin) > Number(edadMax);

  // 🔹 1. Cargar data principal
  useEffect(() => {
    let activo = true;
    Papa.parse(demo ? demoBase + "conversos.csv" : SHEET_URL, {
      download: true,
      header: true,
      error: () => { if (activo) setEstadoCarga("error"); },
      complete: (results) => {
        if (!activo) return;
        if (!["Unidad", "Fecha del bautismo"].every((key) => results.meta.fields?.includes(key))) {
          setEstadoCarga("error");
          return;
        }
        setEstadoCarga("listo");
        const conUnidad = results.data.filter((row) => row.Unidad?.trim());
        const filtered = conUnidad.filter((row) => parseFecha(row["Fecha del bautismo"]));
        setLectura({
          total: conUnidad.length, sinFecha: conUnidad.length - filtered.length,
          edadInvalida: conUnidad.filter(row => String(row.Edad ?? "").trim() && !/^\d+$/.test(String(row.Edad).trim())).length,
          edadVacia: conUnidad.filter(row => !String(row.Edad ?? "").trim()).length,
        });

        setData(filtered.map(row => {
          const refEdad = new Date(hoyDominicano() * 86400000);
          const edad = edadRegistrada(row, new Date(refEdad.getUTCFullYear(), refEdad.getUTCMonth(), refEdad.getUTCDate())).edad;
          return { ...row, Edad: edad === null ? "" : String(edad) };
        }));
        setUltimaLectura(new Date());

        const barriosUnicos = extraerBarriosUnicos(filtered);
        setListaBarrios(barriosUnicos);
        setBarrioSeleccionado((prev) => barriosUnicos.includes(prev) ? prev : "Estaca");

        const fechasValidas = filtered
          .map((row) => parseFecha(row["Fecha del bautismo"]))
          .filter((fecha) => fecha && !isNaN(fecha.getTime()));

        const actual = mesActual();
        const min = new Date(Math.min(actual.start.getTime(), ...fechasValidas.map(fecha => fecha.getTime())));
        const max = new Date(Math.max(actual.end.getTime(), ...fechasValidas.map(fecha => fecha.getTime())));
        min.setDate(1);
        const end = new Date(max.getFullYear(), max.getMonth() + 1, 0);
        const options = [];
        const cursor = new Date(min);
        while (cursor <= end) {
          options.push({ month: cursor.getMonth(), year: cursor.getFullYear() });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        setMonthOptions(options);
      },
    });
    return () => { activo = false; };
  }, [revision]);

  useEffect(() => {
    let activo = true;
    Papa.parse(demo ? demoBase + "seguimiento.csv" : SEGUIMIENTO_URL, {
      download: true, header: true,
      complete: (results) => {
        if (!activo) return;
        const valid = ["Nombre completo", "Fecha de nacimiento", "Unidad"].every(key => results.meta.fields?.includes(key));
        setErrorSeguimiento(!valid);
        setSeguimientoData(valid ? results.data.filter(row => row["Nombre completo"]?.trim()) : []);
      },
      error: () => { if (activo) { setErrorSeguimiento(true); setSeguimientoData([]); } },
    });
    return () => { activo = false; };
  }, [revision]);

  // 🔹 2. Cargar Historia Familiar
  useEffect(() => {
    let activo = true;
    Papa.parse(demo ? demoBase + "historia.csv" : HISTORIA_FAMILIAR_URL, {
      download: true,
      header: true,
      complete: (results) => {
        if (!activo) return;
        const parsed = results.data
          .map((row) => {
            const unidad = row["Unidad"]?.trim();
            const raw = row["Miembros nuevos"];

            if (!unidad || !raw) return null;

            const match = /^(\d+)\s*\/\s*(\d+)$/.exec(raw.trim());
            if (!match) return null;
            const enviados = Number(match[1]);
            const total = Number(match[2]);
            if (enviados > total) return null;
            return { unidad, enviados, total };
          })
          .filter(Boolean);

        setHistoriaFamiliarData(parsed);
      },
    });
    return () => { activo = false; };
  }, [revision]);

  // 🔹 3. Procesamiento principal
  useEffect(() => {
    if (!data.length || !dateRange.start || !dateRange.end) {
      setStats({
        total: 0,
        conRecomendacion: 0,
        promedioDias: 0,
        conLlamamiento: 0,
        promedioDiasSacerdocio: 0,
        conMinistrantes: 0,
        clasificacionEdad: { jovenes: 0, jas: 0, adultos: 0 },
        totalInvestidos: 0,
        totalSellados: 0,
      });
      setUnitData([]);
      setAgeSexData([]);
      return;
    }

    let dataFiltrada = filtrarDemografia(combinarSeguimiento(data, seguimientoData), { sexo, edadMin, edadMax });

    if (barrioSeleccionado !== "Estaca") {
      dataFiltrada = dataFiltrada.filter(
        (row) => row["Unidad"]?.trim() === barrioSeleccionado,
      );
    }

    dataFiltrada = filterByDateRange(dataFiltrada, dateRange);

    const statsCalc = calculateStats(dataFiltrada);
    setStats(statsCalc);

    setUnitData(groupByUnit(dataFiltrada));
    setAgeSexData(groupByAgeSex(dataFiltrada));

    // 👇 NUEVO: cálculo templo
    const templo = calcularIndicadoresTemplo(
      dataFiltrada,
      historiaFamiliarData,
      barrioSeleccionado,
    );

    setTemploStats({ ...templo, enviados: filtrosDemograficos ? null : templo.enviados });
  }, [data, barrioSeleccionado, dateRange, historiaFamiliarData, sexo, edadMin, edadMax, filtrosDemograficos, seguimientoData]);

  const extraerBarriosUnicos = (data) => {
    const barrios = data
      .map((row) => row["Unidad"]?.trim())
      .filter((b) => b && b.length > 0);
    return ["Estaca", ...Array.from(new Set(barrios))];
  };

  const cohorte = dateRange.start && dateRange.end ? filtrarDemografia(filterByDateRange(combinarSeguimiento(data, seguimientoData), dateRange), { sexo, edadMin, edadMax }) : [];
  return (
    <div className="dashboard">
      <nav className="sr-nav" aria-label="Conversos recientes">
        {Object.entries(vistas).map(([key, label]) => (
          <a href={`#${key}`} key={key} aria-current={vista === key ? "page" : undefined}>{label}</a>
        ))}
      </nav>
      {demo && <p className="sr-note"><strong>Modo de prueba:</strong> datos ficticios. <a href={import.meta.env.BASE_URL + "#seguimiento"}>Volver a la hoja real</a></p>}
      {vista === "reporte" ? <ReporteMisionero demoUrl={demo ? demoBase + "formulario" : null} /> : <>
      <section className="sr-filters" aria-labelledby="sr-filters-title">
        <h2 id="sr-filters-title">Filtrar resultados</h2>
        <div className="sr-filter-controls">
          <div className="sr-field">
            <label htmlFor="sr-unidad">Barrio o rama</label>
            <FiltroBarrio barrios={listaBarrios}
              barrioSeleccionado={barrioSeleccionado} setBarrioSeleccionado={setBarrioSeleccionado} />
          </div>
          {dateRange.start && dateRange.end && (
            <MonthYearFilter dateRange={dateRange} setDateRange={setDateRange} monthOptions={monthOptions} />
          )}
          <div className="sr-field">
            <label htmlFor="sr-sexo">Sexo</label>
            <select id="sr-sexo" value={sexo} onChange={(event) => setSexo(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="V">Masculino</option>
              <option value="M">Femenino</option>
              <option value="sin-dato">Sin dato</option>
            </select>
          </div>
          <div className="sr-field">
            <label htmlFor="sr-edad-min">Edad mínima</label>
            <input id="sr-edad-min" type="number" min="0" step="1" placeholder="Sin mínimo" value={edadMin}
              onChange={(event) => setEdadMin(event.target.value === "" ? "" : String(Math.max(0, Math.trunc(Number(event.target.value)))))} />
          </div>
          <div className="sr-field">
            <label htmlFor="sr-edad-max">Edad máxima</label>
            <input id="sr-edad-max" type="number" min="0" step="1" placeholder="Sin máximo" value={edadMax}
              onChange={(event) => setEdadMax(event.target.value === "" ? "" : String(Math.max(0, Math.trunc(Number(event.target.value)))))} />
          </div>
          {filtrosDemograficos && <button className="sr-button" type="button" onClick={() => {
            setSexo("todos"); setEdadMin(""); setEdadMax("");
          }}>Quitar filtros de edad y sexo</button>}
          <button className="sr-button" type="button" disabled={estadoCarga === "cargando"} onClick={() => {
            setEstadoCarga("cargando");
            setRevision((prev) => prev + 1);
          }}>Actualizar datos</button>
        </div>
        {rangoInvalido && <p role="alert">La edad mínima debe ser menor o igual a la máxima.</p>}
        {filtrosDemograficos && <small>Filtros de edad y sexo activos. Los registros sin edad se excluyen si defines un límite de edad. El agregado de Historia familiar no se utiliza porque no está separado por edad y sexo.</small>}
        {ultimaLectura && <small>Última actualización del tablero: <time dateTime={ultimaLectura.toISOString()}>{new Intl.DateTimeFormat("es-DO", {
          timeZone: "America/Santo_Domingo", dateStyle: "medium", timeStyle: "short",
        }).format(ultimaLectura)}</time> · Corresponde a la última lectura correcta de la hoja.</small>}
        <small>Fuente: {demo ? "datos de prueba" : "hoja de Conversos Recientes"} · El período se aplica a la fecha de bautismo.</small>
        {estadoCarga === "listo" && lectura && (
          <small>{lectura.total} registros recibidos de la hoja en total.
            {lectura.sinFecha === 1 ? " Un registro sin fecha de bautismo válida queda fuera del período."
              : lectura.sinFecha > 1 && ` ${lectura.sinFecha} registros sin fecha de bautismo válida quedan fuera del período.`}
          </small>
        )}
        {estadoCarga === "listo" && lectura && (lectura.edadInvalida > 0 || lectura.edadVacia > 0) && (
          <small role="status">Revisar edades en la hoja: {lectura.edadInvalida} con valor inválido y {lectura.edadVacia} sin dato. No se incluyen en los indicadores que requieren edad.</small>
        )}
      </section>
      {errorSeguimiento && <p role="alert">No se pudo leer Seguimiento. Las acciones del formulario no estarán disponibles hasta actualizar los datos correctamente.</p>}
      {estadoCarga === "error" && <p role="alert">No se pudo leer la hoja de conversos. Revisa el acceso y los encabezados.</p>}
      {estadoCarga === "cargando" && <p role="status">Cargando datos de la hoja…</p>}
      {vista === "seguimiento" ? estadoCarga === "listo" && <Seguimiento rows={cohorte} unidad={barrioSeleccionado} historial={filtrosDemograficos ? [] : historiaFamiliarData} onUnidad={setBarrioSeleccionado} /> : vista === "semanal" && ProgresoSemanal ? estadoCarga === "listo" && (
        <Suspense fallback={<p role="status">Cargando progreso semanal…</p>}>
          <ProgresoSemanal rows={cohorte} unidad={barrioSeleccionado} />
        </Suspense>
      ) : <>
      <StatsCards
        stats={stats}
        temploStats={temploStats} // 👈 NUEVO
        dateRange={dateRange}
      />

      <div className="grid-2">
        <UnitChart data={unitData} />
        <AgeChart data={ageSexData} title="Conversos por Edad y Sexo" />
      </div>
      </>}
      </>}
    </div>
  );
}

export default App;
