export function Radio({ active }: { active: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`} >
      {active && <div className="w-2 h-2 rounded-full bg-white" />}
    </div>
  )
}