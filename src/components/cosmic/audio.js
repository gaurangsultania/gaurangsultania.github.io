// Ambient audio engine for the cosmic landing.
//
// Tries to load `${BASE_URL}audio/ambient.mp3` first; when the file is absent
// (it is not committed to the repo) it synthesizes an evolving ambient drone
// with the Web Audio API instead, so the experience never depends on an asset.
//
// Exposes smoothed bass / mid / high energy bands (0..1) that the 3D scene
// reads every frame. Audio can only start from a user gesture (autoplay policy),
// so callers must invoke toggle() from a click handler.

class AmbientAudio {
  constructor() {
    this.ctx = null
    this.analyser = null
    this.master = null
    this.playing = false
    this.started = false
    this.disabled = true // Set to true when SoundCloud embed is present
    this.bands = { bass: 0, mid: 0, high: 0 }
    this._freq = null
  }

  async toggle() {
    if (this.disabled) return false // Skip audio if disabled
    if (!this.started) {
      // memoized so rapid double-clicks can't build two audio graphs
      this._starting ||= this._start()
      await this._starting
      return this.playing
    }
    if (this.playing) {
      await this.ctx.suspend()
      this.playing = false
    } else {
      await this.ctx.resume()
      this.playing = true
    }
    return this.playing
  }

  // hard off-ramp for paths where the toggle button is unreachable
  // (e.g. the user enables prefers-reduced-motion mid-session)
  async mute() {
    if (this._starting) await this._starting
    if (this.started && this.playing) {
      await this.ctx.suspend()
      this.playing = false
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
    this.analyser.smoothingTimeConstant = 0.6
    this._freq = new Uint8Array(this.analyser.frequencyBinCount)

    this.master.connect(this.analyser)
    this.analyser.connect(this.ctx.destination)

    const usedFile = await this._tryFile()
    if (!usedFile) this._buildDrone()

    // Slow fade-in so the soundtrack emerges out of silence.
    this.master.gain.linearRampToValueAtTime(0.38, this.ctx.currentTime + 4)
    this.started = true
    this.playing = true
  }

  async _tryFile() {
    try {
      const url = `${import.meta.env.BASE_URL}audio/ambient.mp3`
      const res = await fetch(url)
      if (!res.ok) return false
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer())
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.loop = true
      src.connect(this.master)
      src.start()
      return true
    } catch {
      return false
    }
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

  // Called once per rendered frame. Fast attack, slow release keeps the
  // reactions organic instead of jittery bar-visualizer motion.
  update() {
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
    this._smooth('bass', avg(25, 140) * 1.35)
    this._smooth('mid', avg(140, 2000) * 1.6)
    this._smooth('high', avg(2000, 8000) * 2.2)
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
