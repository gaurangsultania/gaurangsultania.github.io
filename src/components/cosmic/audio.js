// Ambient audio engine for the cosmic landing.
//
// Streams `${BASE_URL}audio/ambient.mp3` through two <audio> elements into
// one analyser. The track's intro has almost no bass, so playback starts
// where the beat comes in (LOOP_START); before its fade-out (LOOP_END) the
// other element picks up at LOOP_START and the two crossfade, so the loop
// has no audible seam. Streaming keeps memory low — decoding the whole
// file up front would hold ~60 MB of samples.
//
// When the file is missing it falls back to a synthesized drone, so the
// experience never depends on the asset.
//
// Exposes smoothed bass / mid / high energy bands (0..1) and `onset`, true
// on the frame a bass hit lands, with its `onsetStrength`. Audio can only
// start from a user gesture (autoplay policy), so callers must invoke
// toggle() from a click handler.

const SRC = `${import.meta.env.BASE_URL}audio/ambient.mp3`
const LOOP_START = 24 // s — where the pulse enters
const LOOP_END = 157 // s — just before the track fades out
const XFADE = 2.5 // s
const LEVEL = 0.55

class AmbientAudio {
  constructor() {
    this.ctx = null
    this.analyser = null
    this.master = null
    this.playing = false
    this.started = false
    this.bands = { bass: 0, mid: 0, high: 0 }
    this.onset = false
    this.onsetStrength = 0
    this._freq = null
    this._bassAvg = 0
    this._bassDev = 0.02
    this._range = {}
    this._startedAt = 0
    this._lastOnset = 0
    this._decks = []
    this._active = 0
    this._listeners = new Set()
  }

  // subscribe to play/pause changes (for UI)
  subscribe(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  _emit() {
    for (const fn of this._listeners) fn(this.playing)
  }

  async toggle() {
    if (!this.started) {
      // memoized so rapid double-clicks can't build two audio graphs
      this._starting ||= this._start()
      await this._starting
    } else if (this.playing) {
      await this._pause()
    } else {
      await this._resume()
    }
    this._emit()
    return this.playing
  }

  // hard off-ramp: reduced motion switched on, another player started, page hidden
  async mute() {
    if (this._starting) await this._starting
    if (this.started && this.playing) {
      await this._pause()
      this._emit()
    }
  }

  async _start() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.5
    this._freq = new Uint8Array(this.analyser.frequencyBinCount)
    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    const usedFile = await this._startFile()
    if (!usedFile) this._buildDrone()

    // emerge out of silence
    this.master.gain.setValueAtTime(0, this.ctx.currentTime)
    this.master.gain.linearRampToValueAtTime(LEVEL, this.ctx.currentTime + 2.5)
    this._startedAt = this.ctx.currentTime
    this.started = true
    this.playing = true
  }

  async _startFile() {
    const make = () => {
      const el = new Audio(SRC)
      el.preload = 'auto'
      el.crossOrigin = 'anonymous'
      const gain = this.ctx.createGain()
      gain.gain.value = 0
      this.ctx.createMediaElementSource(el).connect(gain)
      gain.connect(this.master)
      return { el, gain }
    }
    const once = (el, ev) => new Promise((res) => el.addEventListener(ev, res, { once: true }))
    try {
      this._decks = [make(), make()]
      const [first, second] = this._decks
      // play() must be called inside the click (Safari): start both decks
      // now — the second only to unlock it for the crossfade — and seek once
      // the first knows its duration
      const playing = first.el.play()
      second.el.play().then(() => second.el.pause()).catch(() => {})
      await playing
      if (first.el.readyState < 1) await once(first.el, 'loadedmetadata')
      first.el.currentTime = LOOP_START
      await once(first.el, 'seeked')
      first.gain.gain.value = 1
      this._active = 0
      this._watch()
      return true
    } catch {
      for (const d of this._decks) d.el.pause()
      this._decks = []
      return false
    }
  }

  // crossfade to the other deck shortly before the active one reaches LOOP_END
  _watch() {
    const tick = () => {
      if (!this._decks.length) return
      const cur = this._decks[this._active]
      if (this.playing && cur.el.currentTime >= LOOP_END - XFADE && !this._crossing) {
        this._crossing = true
        const next = this._decks[1 - this._active]
        next.el.currentTime = LOOP_START
        next.el.play().catch(() => {})
        const now = this.ctx.currentTime
        cur.gain.gain.setValueAtTime(cur.gain.gain.value, now)
        cur.gain.gain.linearRampToValueAtTime(0, now + XFADE)
        next.gain.gain.setValueAtTime(0, now)
        next.gain.gain.linearRampToValueAtTime(1, now + XFADE)
        setTimeout(() => {
          cur.el.pause()
          this._active = 1 - this._active
          this._crossing = false
        }, XFADE * 1000 + 50)
      }
      this._watchTimer = setTimeout(tick, 200)
    }
    tick()
  }

  async _pause() {
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(0, now + 0.4)
    this.playing = false
    await new Promise((r) => setTimeout(r, 420))
    if (this.playing) return // resumed during the fade
    for (const d of this._decks) d.el.pause()
    await this.ctx.suspend()
  }

  async _resume() {
    await this.ctx.resume()
    const live = this._decks[this._active]
    if (live) await live.el.play().catch(() => {})
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(LEVEL, now + 0.8)
    this.playing = true
  }

  _buildDrone() {
    const ctx = this.ctx

    // Feedback delay gives the pad its sense of space.
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.42
    const feedback = ctx.createGain()
    feedback.gain.value = 0.35
    const wet = ctx.createGain()
    wet.gain.value = 0.3
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wet)
    wet.connect(this.master)

    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 1200
    lowpass.connect(this.master)
    lowpass.connect(delay)

    // A voice = oscillator whose gain breathes on its own slow LFO cycle.
    const voice = (type, freq, base, lfoRate, lfoDepth) => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      const gain = ctx.createGain()
      gain.gain.value = base
      const lfo = ctx.createOscillator()
      lfo.frequency.value = lfoRate
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)
      osc.connect(gain)
      gain.connect(lowpass)
      osc.start()
      lfo.start()
    }

    voice('sine', 55, 0.2, 0.05, 0.09) // deep root
    voice('sine', 110.7, 0.11, 0.073, 0.06) // detuned octave, slow beating
    voice('triangle', 164.8, 0.05, 0.11, 0.03) // fifth
    voice('sine', 330.6, 0.02, 0.031, 0.014) // shimmer
    voice('sine', 883, 0.007, 0.017, 0.006) // high sparkle

    // Filtered noise = air.
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 2600
    bandpass.Q.value = 0.6
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.012
    const noiseLfo = ctx.createOscillator()
    noiseLfo.frequency.value = 0.043
    const noiseLfoGain = ctx.createGain()
    noiseLfoGain.gain.value = 0.008
    noiseLfo.connect(noiseLfoGain)
    noiseLfoGain.connect(noiseGain.gain)
    noise.connect(bandpass)
    bandpass.connect(noiseGain)
    noiseGain.connect(lowpass)
    noise.start()
    noiseLfo.start()
  }

  // Called once per rendered frame. The analyser reports decibel-scaled
  // levels that sit in a narrow band for any given track, so each band is
  // normalised against its own slowly adapting floor and ceiling — the
  // visuals then use the track's full range whatever its mastering. Fast
  // attack, slow release keeps the reactions organic.
  //
  // A bass hit is the bass rising well clear of its recent average, scaled
  // by how much it usually wanders, at most one per 0.3 s.
  update() {
    this.onset = false
    if (!this.playing || !this.analyser) {
      this._relax()
      return
    }
    this.analyser.getByteFrequencyData(this._freq)
    const hzPerBin = this.ctx.sampleRate / 2 / this._freq.length
    const avg = (lo, hi) => {
      const a = Math.max(1, Math.round(lo / hzPerBin))
      const b = Math.min(this._freq.length - 1, Math.round(hi / hzPerBin))
      let sum = 0
      for (let i = a; i <= b; i++) sum += this._freq[i]
      return sum / (b - a + 1) / 255
    }
    const bass = avg(25, 140)
    // squared so the swell follows the peaks rather than sitting high
    this._smooth('bass', this._norm('bass', bass) ** 2)
    this._smooth('mid', this._norm('mid', avg(140, 2000)) ** 2)
    this._smooth('high', this._norm('high', avg(2000, 8000)))

    const now = this.ctx.currentTime
    const rise = bass - this._bassAvg
    if (rise > Math.max(0.025, this._bassDev * 1.6) && now - this._lastOnset > 0.3) {
      this.onset = true
      this.onsetStrength = Math.min(1, 0.45 + rise / (this._bassDev * 6 + 0.01))
      this._lastOnset = now
    }
    this._bassAvg += (bass - this._bassAvg) * 0.08
    this._bassDev += (Math.abs(rise) - this._bassDev) * 0.02
  }

  // 0..1 position of v between the band's recent floor and ceiling; each
  // follows a new extreme quickly and relaxes back slowly
  _norm(key, v) {
    const r = (this._range[key] ||= { lo: v - 0.05, hi: v + 0.05 })
    // ignore the first second: the fade-in from silence would latch the floor
    if (this.ctx.currentTime - this._startedAt < 1) return 0
    r.lo += (v - r.lo) * (v < r.lo ? 0.05 : 0.002)
    r.hi += (v - r.hi) * (v > r.hi ? 0.2 : 0.002)
    return Math.max(0, Math.min(1, (v - r.lo) / Math.max(0.04, r.hi - r.lo)))
  }

  _smooth(key, target) {
    const cur = this.bands[key]
    const k = target > cur ? 0.35 : 0.06
    this.bands[key] = Math.min(1, cur + (target - cur) * k)
  }

  _relax() {
    this.bands.bass *= 0.97
    this.bands.mid *= 0.97
    this.bands.high *= 0.97
  }
}

export const ambient = new AmbientAudio()

// dev-only handle for inspecting the engine from the console
if (import.meta.env.DEV) window.__ambient = ambient
