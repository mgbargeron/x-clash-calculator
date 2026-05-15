import Decimal from "decimal.js";
import { formatInputValue } from "../../utils/formatInputValue";
import { formatWholeDecimal } from "../../utils/formatWholeDecimal";

type ChestRequirement = {
  description: string;
  chestValue: Decimal;
  toNext: Decimal;
  toMax: Decimal;
};

type HeroExpRequirementsProps = {
  chestRequirements: ChestRequirement[];
  progression: {
    achievedLevel: number;
  };
};

export function HeroExpRequirements({ chestRequirements, progression }: HeroExpRequirementsProps) {
  return (
    <section className="hero-surface">
      <div className="hero-section-heading">
        <div>
          <p className="hero-section-label">Requirements</p>
          <h2>Chest counts needed</h2>
        </div>
      </div>

      <div className="hero-exp-chest-grid">
        {chestRequirements.map((requirement) => (
          <section className="hero-exp-chest-card" key={requirement.description}>
            <p>{requirement.description}</p>
            <strong>{formatInputValue(requirement.chestValue.toString())} EXP</strong>
            <span>
              To next:{" "}
              {progression.achievedLevel >= 150
                ? "Maxed"
                : requirement.chestValue.lte(0)
                  ? "Set chest value"
                  : formatWholeDecimal(requirement.toNext)}
            </span>
            <span>
              To 150:{" "}
              {requirement.chestValue.gt(0)
                ? formatWholeDecimal(requirement.toMax)
                : "Set chest value"}
            </span>
          </section>
        ))}
      </div>
    </section>
  );
}
