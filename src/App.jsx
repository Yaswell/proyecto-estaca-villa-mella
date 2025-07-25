import { useEffect, useState } from "react";
import MonthYearFilter from "./components/MonthYearFilter";
import StatsCards from "./components/StatsCards";
import { AgeChart } from "./components/AgeChart";
import { UnitChart } from "./components/UnitChart";
import { FiltroBarrio } from "./components/filtroBarrio";
import Papa from "papaparse";

import {
  calculateStats,
  groupByAge,
  groupByUnit,
  groupByAgeSex,
  parseFecha,
  filterByDateRange,
} from "./utils/dataProcessor";

import "./index.css";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/gviz/tq?tqx=out:csv&gid=0";

function App() {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    conRecomendacion: 0,
    promedioDias: 0,
    conLlamamiento: 0,
    promedioDiasSacerdocio: 0,
    conMinistrantes: 0,
    clasificacionEdad: { jovenes: 0, jas: 0, adultos: 0 },
  });
  const [ageData, setAgeData] = useState([]);
  const [ageSexData, setAgeSexData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [barrioSeleccionado, setBarrioSeleccionado] = useState("Estaca");
  const [listaBarrios, setListaBarrios] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  // 1. Cargar datos desde la hoja de cálculo

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const filtered = results.data.filter(
          (row) =>
            row["Nombre de preferencia"] &&
            Object.values(row).some((v) => v && v.trim && v.trim() !== "")
        );
        console.log("Total crudo:", results.data.length);
        console.log("Filtrados válidos:", filtered.length);

        setData(filtered);

        const barriosUnicos = extraerBarriosUnicos(filtered);
        setListaBarrios(barriosUnicos);

        const fechasValidas = filtered
          .map((row) => parseFecha(row["Fecha del bautismo"]))
          .filter((fecha) => fecha && !isNaN(fecha.getTime()));

        if (fechasValidas.length > 0) {
          const min = new Date(Math.min(...fechasValidas));
          const max = new Date(Math.max(...fechasValidas));

          // Primer día del mes mínimo
          min.setDate(1);

          // Último día del mes del último bautismo
          const end = new Date(max.getFullYear(), max.getMonth() + 1, 0); // ← Esto es 30 o 31 dependiendo

          setDateRange({ start: min, end });

          // Generar lista de meses únicos desde min hasta end
          const options = [];
          const cursor = new Date(min);
          while (cursor <= end) {
            options.push({
              month: cursor.getMonth(),
              year: cursor.getFullYear(),
            });
            cursor.setMonth(cursor.getMonth() + 1);
          }

          setMonthOptions(options);
        }
      },
    });
  }, []);

  // 2. Procesar datos cuando haya cambios
  useEffect(() => {
    if (!data.length || !dateRange.start || !dateRange.end) {
      setFilteredData([]);
      setStats({
        total: 0,
        conRecomendacion: 0,
        promedioDias: 0,
        conLlamamiento: 0,
        promedioDiasSacerdocio: 0,
        conMinistrantes: 0,
        clasificacionEdad: { jovenes: 0, jas: 0, adultos: 0 },
      });
      setAgeData([]);
      setUnitData([]);
      setAgeSexData([]);
      return;
    }

    let dataFiltrada = data;

    if (barrioSeleccionado !== "Estaca") {
      dataFiltrada = dataFiltrada.filter(
        (row) => row["Unidad"]?.trim() === barrioSeleccionado
      );
    }

    dataFiltrada = filterByDateRange(dataFiltrada, dateRange);
    console.log(
      "Rango activo:",
      dateRange.start?.toLocaleDateString(),
      "-",
      dateRange.end?.toLocaleDateString()
    );
    console.log("Filas después del filtro de fechas:", dataFiltrada.length);
    setFilteredData(dataFiltrada);

    const statsCalc = calculateStats(dataFiltrada);
    setStats({
      total: statsCalc.total,
      conRecomendacion: statsCalc.conRecomendacion,
      promedioDias: statsCalc.promedioDias,
      conLlamamiento: statsCalc.conLlamamiento,
      promedioDiasSacerdocio: statsCalc.promedioDiasSacerdocio,
      conMinistrantes: statsCalc.conMinistrantes,
      clasificacionEdad: statsCalc.clasificacionEdad,
    });

    setAgeData(groupByAge(dataFiltrada));
    setUnitData(groupByUnit(dataFiltrada));
    setAgeSexData(groupByAgeSex(dataFiltrada));
  }, [data, barrioSeleccionado, dateRange]);

  const extraerBarriosUnicos = (data) => {
    const barrios = data
      .map((row) => row["Unidad"]?.trim())
      .filter((b) => b && b.length > 0);
    return ["Estaca", ...Array.from(new Set(barrios))];
  };

  return (
    <div className="dashboard">
      <div className="grid-1">
        <span>Estadísticas de Conversos - Estaca Villa Mella</span>
      </div>
      <div className="filtro-barrio-container">
        {dateRange.start && dateRange.end && (
          <MonthYearFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            monthOptions={monthOptions}
          />
        )}
      </div>
      <div className="filtro-barrio-container">
        <FiltroBarrio
          barrios={listaBarrios}
          barrioSeleccionado={barrioSeleccionado}
          setBarrioSeleccionado={setBarrioSeleccionado}
        />
      </div>

      <StatsCards stats={stats} dateRange={dateRange} />

      <div className="grid-2">
        <UnitChart data={unitData} />
        <AgeChart data={ageSexData} title="Conversos por Edad y Sexo" />
      </div>
    </div>
  );
}

export default App;
