import React from "react";
import { RetailSystemDiagram } from "@/components/DataFlowDiagram/modules/RetailSystemDiagram";

const TestRetailDiagram = () => {
  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">
          Teste: RetailSystemDiagram
        </h1>
        <div className="aspect-[4/3] w-full border border-white/10 rounded-lg overflow-hidden">
          <RetailSystemDiagram />
        </div>
      </div>
    </div>
  );
};

export default TestRetailDiagram;
