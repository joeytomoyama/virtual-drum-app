import Drumset from './Drumset.jsx'
import TopSection from './TopSection.jsx'

export default function App() {
  return (
    <div className="min-h-dvh w-full bg-linear-to-br from-slate-700 via-slate-600 to-slate-800 p-4 text-white sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <TopSection className="min-h-48" />
        <Drumset />
      </div>
    </div>
  )
}
