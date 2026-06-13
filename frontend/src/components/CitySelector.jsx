const CITIES = [
  { key: 'bangalore', label: 'Bangalore' },
  { key: 'delhi',     label: 'Delhi' },
  { key: 'mumbai',    label: 'Mumbai' },
  { key: 'hyderabad', label: 'Hyderabad' },
  { key: 'chennai',   label: 'Chennai' },
  { key: 'pune',      label: 'Pune' },
]

export default function CitySelector({ city, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">City</span>
      {CITIES.map(c => (
        <button
          key={c.key}
          onClick={() => onChange(c.key)}
          className={`pill-btn ${city === c.key ? 'pill-active' : 'pill-inactive'}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
