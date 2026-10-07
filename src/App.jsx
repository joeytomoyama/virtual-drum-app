import Drumset from './Drumset.jsx'
import { useCallback, useRef, useState } from 'react'
import RhythmPractice from './rhythm/RhythmPractice.jsx'
import { loadSavedKeyMap } from './keyBindings.js'

export default function App() {
  const [keyMap, setKeyMap] = useState(loadSavedKeyMap)
  const [listeningFor, setListeningFor] = useState(null)
  const practiceRef = useRef(null)
  const onDrumHit = useCallback((id, at) => practiceRef.current?.hit(id, at), [])
  const pausePractice = useCallback(() => practiceRef.current?.pause(), [])
  return (
    <div className="min-h-dvh w-full bg-linear-to-br from-slate-700 via-slate-600 to-slate-800 p-4 text-white sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <RhythmPractice keyMap={keyMap} listeningFor={listeningFor} controlsRef={practiceRef} />
        <Drumset keyMap={keyMap} setKeyMap={setKeyMap} listeningFor={listeningFor} setListeningFor={setListeningFor} onDrumHit={onDrumHit} pausePractice={pausePractice} />
      </div>
    </div>
  )
}
