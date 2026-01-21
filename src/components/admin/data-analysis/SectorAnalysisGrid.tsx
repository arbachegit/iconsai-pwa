import { IncomeChart } from "./charts/IncomeChart";
import { SalesChart } from "./charts/SalesChart";
import { ImpactScatter } from "./charts/ImpactScatter";
import { ClassesAreaChart } from "./charts/ClassesAreaChart";

interface AnnualData {
  year: number;
  income: number;
  sales: number;
  pmcVest: number;
  pmcMov: number;
  pmcFarm: number;
  pmcComb: number;
  pmcVeic: number;
  pmcConst: number;
  incomeClassA: number;
  incomeClassB: number;
  incomeClassC: number;
  incomeClassD: number;
  incomeClassE: number;
  [key: string]: number;
}

interface SectorAnalysisGridProps {
  sectorCode: string;
  sectorLabel: string;
  annualData: AnnualData[];
}

export function SectorAnalysisGrid({ sectorCode, sectorLabel, annualData }: SectorAnalysisGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Linha 1 */}
      <IncomeChart data={annualData} />
      <ImpactScatter data={annualData} sectorCode={sectorCode} />
      
      {/* Linha 2 */}
      <SalesChart data={annualData} sectorCode={sectorCode} sectorLabel={sectorLabel} />
      <ClassesAreaChart data={annualData} />
    </div>
  );
}
