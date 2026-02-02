export function Radio({ active }: { active: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-brand bg-brand-solid' : 'border-primary'}`} >
      {active && <div className="w-2 h-2 rounded-full bg-primary" />}
    </div>
  )
}
