import {type ReactNode} from "react";
import { HeroExpCalculator } from "../components/heroExp";

const HERO_EXP_STORAGE_KEY = "hero-exp-quantity-rows";

type HeroExpPageProps = {
  gridValues: string[][];
  updateGridCell: (rowIndex: number, columnIndex: number, value: string) => void;
  navigation: ReactNode;
};

export default function HeroExpPage({gridValues, updateGridCell, navigation}: HeroExpPageProps) {
  return (
    <section className="card calculator">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Hero progression</p>
          <h1>Hero Exp Calculator</h1>
          <p className="description">
            Set hero exp chest values, then enter quantities to total your available exp.
          </p>
        </div>
        {navigation}
      </div>

      <div className="tables-container">
        <HeroExpCalculator
          chestValues={gridValues[2]}
          onChestValueChange={(columnIndex, value) => updateGridCell(2, columnIndex, value)}
          storageKey={HERO_EXP_STORAGE_KEY}
        />
      </div>
    </section>
  );
}
