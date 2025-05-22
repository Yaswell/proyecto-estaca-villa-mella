import { useEffect, useState } from "react";
import Papa from "papaparse";

import StatsCards from "./components/StatsCards";
import { AgeChart } from "./components/AgeChart";
import { UnitChart } from "./components/UnitChart";
import { FiltroBarrio } from "./components/filtroBarrio";

import {
  calculateStats,
  groupByAge,
  groupByUnit,
  groupByAgeSex,
} from "./utils/dataProcessor";

import "./index.css";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1O9Ut_dgQdinJB2yPqk36Ozev2ADdYqq0QYG-4LzrhH0/gviz/tq?tqx=out:csv&gid=0";

function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    conRecomendacion: 0,
    promedioDias: 0,
    conLlamamiento: 0,
  });
  const [ageData, setAgeData] = useState([]);
  const [ageSexData, setAgeSexData] = useState([]);
  const [unitData, setUnitData] = useState([]);
  const [barrioSeleccionado, setBarrioSeleccionado] = useState("Estaca");
  const [listaBarrios, setListaBarrios] = useState([]);

  // Función para extraer barrios únicos
  const extraerBarriosUnicos = (data) => {
    const barrios = data
      .map((row) => row["Unidad"]?.trim())
      .filter((b) => b && b.length > 0);
    return ["Estaca", ...Array.from(new Set(barrios))];
  };

  // Carga inicial y extracción de barrios
  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const filtered = results.data.filter(
          (row) => row["Nombre de preferencia"]
        );
        setData(filtered);

        // Extraemos barrios
        const barriosUnicos = extraerBarriosUnicos(filtered);
        setListaBarrios(barriosUnicos);
      },
    });
  }, []);

  // Filtrar datos cada vez que cambie barrio o data
  useEffect(() => {
    let dataFiltrada = data;
    if (barrioSeleccionado !== "Estaca") {
      dataFiltrada = data.filter(
        (row) => row["Unidad"]?.trim() === barrioSeleccionado
      );
    }

    setFilteredData(dataFiltrada);

    // Calcular stats y agrupar datos con datos filtrados
    const statsCalc = calculateStats(dataFiltrada);
    setStats({
      total: statsCalc.total,
      conRecomendacion: statsCalc.conRecomendacion,
      promedioDias: statsCalc.promedioDias,
      conLlamamiento: statsCalc.conLlamamiento,
    });

    setAgeData(groupByAge(dataFiltrada));
    setUnitData(groupByUnit(dataFiltrada));
    setAgeSexData(groupByAgeSex(dataFiltrada));
  }, [barrioSeleccionado, data]);

  return (
    <div className="dashboard">
      <div
        className="grid-1"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Estadísticas de Conversos - Estaca Villa Mella</span>
        <FiltroBarrio
          barrios={listaBarrios}
          barrioSeleccionado={barrioSeleccionado}
          setBarrioSeleccionado={setBarrioSeleccionado}
        />
      </div>

      <StatsCards stats={stats} />

      <div className="grid-2">
        <UnitChart data={unitData} />
        <AgeChart data={ageSexData} title="Conversos por Edad y Sexo" />
      </div>
    </div>
  );
}

export default App;
