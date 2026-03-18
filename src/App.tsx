import CalculationTable from "./CalculationTable";


export type Row = {
  description: string
  value: string
  quantity: string
  isStatic?: boolean
}

const WHEAT_STORAGE_KEY = 'wheat-quantity-rows'
const IRON_STORAGE_KEY = 'iron-quantity-rows'
const GOLD_STORAGE_KEY = 'gold-quantity-rows'


const rssRows: Row[] = [
  {
    description: '1k Chest',
    value: '1000',
    quantity: '',
    isStatic: true,
  },
  {
    description: '10K Chest',
    value: '10000',
    quantity: '',
    isStatic: true,
  },
  {
    description: '50K Chest',
    value: '50000',
    quantity: '',
    isStatic: true,
  },
  {
    description: 'Blue Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
  {
    description: 'Purple Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
  {
    description: 'Legendary Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
]

const initialWheatRows: Row[] = structuredClone(rssRows)
const initialIronRows: Row[] = structuredClone(rssRows)
const initialGoldRows: Row[] = [
  {
    description: '600 Chest',
    value: '600',
    quantity: '',
    isStatic: true,
  },
  {
    description: '6k Chest',
    value: '6000',
    quantity: '',
    isStatic: true,
  },
  {
    description: '30k Chest',
    value: '30000',
    quantity: '',
    isStatic: true,
  },
  {
    description: 'Blue Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
  {
    description: 'Purple Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
  {
    description: 'Legendary Chest',
    value: '',
    quantity: '',
    isStatic: false,
  },
]



export default function App() {
  return (
    <main className="app">
      <section className="card calculator">
        <p className="eyebrow">Auto total calculator</p>
        <h1>Chest Value × Quantity</h1>
        <p className="description">
          Enter a value and quantity for each row. Totals update automatically.
        </p>
        <div className="tables-container">
          <div className="calculator-wrapper">
            <CalculationTable
              initialRows={initialWheatRows}
              resourceName="Wheat"
              storageKey={WHEAT_STORAGE_KEY}
            />
          </div>
          <div className="calculator-wrapper">
            <CalculationTable
              initialRows={initialIronRows}
              resourceName={"Iron"}
              storageKey={IRON_STORAGE_KEY}
            />
          </div>
          <div className="calculator-wrapper">
            <CalculationTable
              initialRows={initialGoldRows}
              resourceName={"Gold"}
              storageKey={GOLD_STORAGE_KEY}
            />
          </div>
        </div>
      </section>
    </main>
  )
}