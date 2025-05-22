import { useEffect, useState } from "react";
import Papa from "papaparse";

import StatsCards from "./components/StatsCards";
import { AgeChart } from "./components/AgeChart";
import { UnitChart } from "./components/UnitChart";
import { TempleChart } from "./components/TempleChart";

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
  const [stats, setStats] = useState({
    total: 0,
    conRecomendacion: 0,
    promedioDias: 0,
    conLlamamiento: 0,
  });
  const [ageData, setAgeData] = useState([]);
  const [ageSexData, setAgeSexData] = useState([]);
  const [unitData, setUnitData] = useState([]);

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      complete: (results) => {
        const filtered = results.data.filter(
          (row) => row["Nombre de preferencia"]
        );
        setData(filtered);

        const statsCalc = calculateStats(filtered);
        setStats({
          total: statsCalc.total,
          recomendacionActiva: statsCalc.conRecomendacion,
          tiempoPromedioRecomendacion: statsCalc.promedioDias,
          conLlamamiento: statsCalc.conLlamamiento,
        });

        setAgeData(groupByAge(filtered));
        setUnitData(groupByUnit(filtered));
        setAgeSexData(groupByAgeSex(filtered));
      },
    });
  }, []);

  return (
    <div className="dashboard">
      <div className="grid-1">
        <span> Estadisticas de Conversos - Estaca Villa Mella</span>
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
