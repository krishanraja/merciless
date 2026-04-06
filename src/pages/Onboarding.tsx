import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNatalChart } from '../hooks/useNatalChart'

export default function Onboarding() {
  const navigate = useNavigate()
  const { calculateChart, calculating } = useNatalChart()

  const [step, setStep] = useState(0)
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [unknownTime, setUnknownTime] = useState(false)
  const [birthLocation, setBirthLocation] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    setError(null)
    if (step === 0 && !birthDate) {
      setError('Birth date is required.')
      return
    }
    if (step === 2 && !birthLocation) {
      setError('Birth location is required.')
      return
    }
    if (step < 2) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setStep(3)
    setError(null)
    try {
      const chart = await calculateChart({
        birth_date: birthDate,
        birth_time: unknownTime ? undefined : birthTime,
        birth_location: birthLocation,
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (chart) {
        navigate('/reading')
      } else {
        setError('Failed to calculate your chart. Please try again.')
        setStep(2)
      }
    } catch (err: any) {
      setError(err.message)
      setStep(2)
    }
  }

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-12">
          <img src="/merciless-orange-icon.svg" alt="Merciless" className="h-9 w-9 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-merciless-white mb-3">
            {step < 3 ? 'Build your chart' : 'Calculating your chart'}
          </h1>
          <p className="text-merciless-muted text-sm">
            {step < 3 ? 'We need your exact birth data to read your chart accurately.' : 'This takes a moment. Your chart is being calculated from your birth data.'}
          </p>
        </div>

        {/* Progress */}
        {step < 3 && (
          <div className="flex gap-2 mb-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? 'bg-merciless-gold' : 'bg-merciless-border'
                }`}
              />
            ))}
          </div>
        )}

        {/* Steps */}
        <div className="merciless-card p-8 space-y-6">
          {step === 0 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl text-merciless-gold">☉</span>
                  <div>
                    <h2 className="text-merciless-white font-semibold">When were you born?</h2>
                    <p className="text-merciless-muted text-sm">Your Sun, Moon, and all planets depend on this.</p>
                  </div>
                </div>
                <label className="text-xs tracking-widest text-merciless-muted block mb-2">BIRTH DATE</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white text-sm"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl text-merciless-muted">↑</span>
                  <div>
                    <h2 className="text-merciless-white font-semibold">What time were you born?</h2>
                    <p className="text-merciless-muted text-sm">Determines your Rising sign and house placements.</p>
                  </div>
                </div>

                {!unknownTime && (
                  <div className="mb-4">
                    <label className="text-xs tracking-widest text-merciless-muted block mb-2">BIRTH TIME</label>
                    <input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white text-sm"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setUnknownTime(!unknownTime)}
                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                      unknownTime
                        ? 'bg-merciless-gold border-merciless-gold'
                        : 'bg-merciless-black border-merciless-border group-hover:border-merciless-gold/40'
                    }`}
                  >
                    {unknownTime && <span className="text-merciless-black text-xs">✓</span>}
                  </div>
                  <span className="text-merciless-muted text-sm">I don't know my birth time</span>
                </label>
                {unknownTime && (
                  <p className="text-merciless-muted text-xs mt-3 leading-relaxed">
                    We'll use noon as a default. Your Sun, Moon, and planetary signs will still be accurate. Rising sign and house placements won't be.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl text-merciless-gold">♃</span>
                  <div>
                    <h2 className="text-merciless-white font-semibold">Where were you born?</h2>
                    <p className="text-merciless-muted text-sm">City and country. Used to determine latitude/longitude.</p>
                  </div>
                </div>
                <label className="text-xs tracking-widest text-merciless-muted block mb-2">BIRTH LOCATION</label>
                <input
                  type="text"
                  value={birthLocation}
                  onChange={(e) => setBirthLocation(e.target.value)}
                  placeholder="e.g. New York, USA"
                  className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-widest text-merciless-muted block mb-2">LATITUDE (optional)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude || ''}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || undefined)}
                    placeholder="40.7128"
                    className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest text-merciless-muted block mb-2">LONGITUDE (optional)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude || ''}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || undefined)}
                    placeholder="-74.0060"
                    className="w-full bg-merciless-black border border-merciless-border rounded-lg px-4 py-3 text-merciless-white placeholder-merciless-muted text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in text-center py-8 space-y-6">
              <div className="text-6xl animate-pulse">☽</div>
              <div className="space-y-2">
                <div className="text-merciless-white font-semibold">Reading the positions...</div>
                <div className="text-merciless-muted text-sm">Calculating planetary longitudes from your birth data</div>
              </div>
              <div className="space-y-2 text-xs text-merciless-muted">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-merciless-gold animate-pulse">●</span>
                  <span>Sun · Moon · Mercury · Venus · Mars</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-merciless-violet-light animate-pulse">●</span>
                  <span>Jupiter · Saturn · Uranus · Neptune · Pluto</span>
                </div>
              </div>
            </div>
          )}

          {error && step < 3 && (
            <div className="text-merciless-danger text-sm bg-merciless-danger/10 border border-merciless-danger/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {step < 3 && (
          <div className="flex gap-4 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3.5 border border-merciless-border text-merciless-muted font-semibold text-sm rounded-lg hover:border-merciless-gold/30 hover:text-merciless-white transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={calculating}
              className="flex-1 py-3.5 bg-merciless-gold text-merciless-black font-bold text-sm tracking-widest rounded-lg hover:bg-merciless-gold/90 transition-all disabled:opacity-50"
            >
              {step === 2 ? 'CALCULATE MY CHART' : 'NEXT'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
