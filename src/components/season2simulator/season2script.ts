export function calculateDarkOil(cityCounts: Record<number, number>): number {
  const production: Record<number, number> = {
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    6: 600,
  };

  let total = 0;
  for (const level in cityCounts) {
    const levelNum = parseInt(level, 10);
    if (production[levelNum] !== undefined) {
      total += cityCounts[levelNum] * production[levelNum];
    }
  }
  return total;
}

export const cityOpenDays: Record<number, string> = {
  1: "Level 1 City Opens",
  5: "Level 2 City Opens",
  8: "Level 3 City Opens",
  12: "Level 4 City Opens",
  15: "Level 5 City Opens",
  19: "Level 6 City Opens",
};

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export interface CityCounts {
  [level: number]: number;
}

export interface SimulationOutput {
  title: string;
  darkOilPerHour: number;
  hours: number;
  earned: number;
  currentTotal: number;
}

export function simulateDay(
  day: number,
  hours: number,
  cityCounts: CityCounts,
  previousTotal: number,
  part: number = 1,
  totalParts: number = 1,
): SimulationOutput {
  const hasCityOpenEvent = day in cityOpenDays;
  const titleBase = hasCityOpenEvent ? `${day} (${cityOpenDays[day]})` : `${day}`;
  const title = totalParts > 1 ? `${titleBase} - Part ${part}` : titleBase;

  const darkOilPerHour = calculateDarkOil(cityCounts);
  const earned = darkOilPerHour * hours;
  const currentTotal = previousTotal + earned;

  return {
    title,
    darkOilPerHour,
    hours,
    earned,
    currentTotal,
  };
}