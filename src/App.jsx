import { useEffect, useState } from "react";
import MonthYearFilter from "./components/MonthYearFilter";
import StatsCards from "./components/StatsCards";
import { AgeChart } from "./components/AgeChart";
import { UnitChart } from "./components/UnitChart";
import { FiltroBarrio } from "./components/filtroBarrio";
import { TemploChart } from "./components/TemploChart"; // 👈 NUEVO
import Papa from "papaparse";

import {
  calculateStats,
  groupByAge,
  groupByUnit,
  groupByAgeSex,
  parseFecha,
  filterByDateRange,
  calcularIndicadoresTemplo,
} from "./utils/dataProcessor";

import "./index.css";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/gviz/tq?tqx=out:csv&gid=0";

const HISTORIA_FAMILIAR_URL =
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/gviz/tq?tqx=out:csv&gid=512269246";

function App() {
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [historiaFamiliarData, setHistoriaFamiliarData] = useState([]); // 👈 NUEVO

  const [temploStats, setTemploStats] = useState({
    totalEdad: 0,
    conRecomendacion: 0,
    enviados: 0,
  });

  const [hoverDetalle, setHoverDetalle] = useState({
    titulo: "",
    personas: [],
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

  const [ageData, setAgeData] = useState([]);
  const [ageSexData, setAgeSexData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [barrioSeleccionado, setBarrioSeleccionado] = useState("Estaca");
  const [listaBarrios, setListaBarrios] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);

  const handleHover = (titulo, filtroCallback) => {
    const personas = filtroCallback(filteredData);
    setHoverDetalle({ titulo, personas });
  };

  const handleLeave = () => {
    setHoverDetalle({ titulo: "", personas: [] });
  };

  // 🔹 1. Cargar data principal
  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const filtered = results.data.filter(
          (row) =>
            row["Nombre de preferencia"] &&
            Object.values(row).some((v) => v && v.trim && v.trim() !== ""),
        );

        setData(filtered);

        const barriosUnicos = extraerBarriosUnicos(filtered);
        setListaBarrios(barriosUnicos);

        const fechasValidas = filtered
          .map((row) => parseFecha(row["Fecha del bautismo"]))
          .filter((fecha) => fecha && !isNaN(fecha.getTime()));

        if (fechasValidas.length > 0) {
          const min = new Date(Math.min(...fechasValidas));
          const max = new Date(Math.max(...fechasValidas));

          min.setDate(1);
          const end = new Date(max.getFullYear(), max.getMonth() + 1, 0);

          setDateRange({ start: min, end });

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

  // 🔹 2. Cargar Historia Familiar
  useEffect(() => {
    Papa.parse(HISTORIA_FAMILIAR_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const parsed = results.data
          .map((row) => {
            const unidad = row["Unidad"]?.trim();
            const raw = row["Miembros nuevos"];

            if (!unidad || !raw) return null;

            const [enviados, total] = raw
              .split("/")
              .map((v) => parseInt(v.trim()));

            return {
              unidad,
              enviados: isNaN(enviados) ? 0 : enviados,
              total: isNaN(total) ? 0 : total,
            };
          })
          .filter(Boolean);

        setHistoriaFamiliarData(parsed);
      },
    });
  }, []);

  // 🔹 3. Procesamiento principal
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
        totalInvestidos: 0,
        totalSellados: 0,
      });
      setAgeData([]);
      setUnitData([]);
      setAgeSexData([]);
      return;
    }

    let dataFiltrada = data;

    if (barrioSeleccionado !== "Estaca") {
      dataFiltrada = dataFiltrada.filter(
        (row) => row["Unidad"]?.trim() === barrioSeleccionado,
      );
    }

    dataFiltrada = filterByDateRange(dataFiltrada, dateRange);
    setFilteredData(dataFiltrada);

    const statsCalc = calculateStats(dataFiltrada);
    setStats(statsCalc);

    setAgeData(groupByAge(dataFiltrada));
    setUnitData(groupByUnit(dataFiltrada));
    setAgeSexData(groupByAgeSex(dataFiltrada));

    // 👇 NUEVO: cálculo templo
    const templo = calcularIndicadoresTemplo(
      dataFiltrada,
      historiaFamiliarData,
      barrioSeleccionado,
    );

    setTemploStats(templo);
  }, [data, barrioSeleccionado, dateRange, historiaFamiliarData]);

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

      <StatsCards
        stats={stats}
        temploStats={temploStats} // 👈 NUEVO
        dateRange={dateRange}
        handleHover={handleHover}
        handleLeave={handleLeave}
        hoverDetalle={hoverDetalle} // 👈 también faltaba esto
      />

      <div className="grid-2">
        <UnitChart data={unitData} />
        <AgeChart data={ageSexData} title="Conversos por Edad y Sexo" />
      </div>
    </div>
  );
}

export default App;
