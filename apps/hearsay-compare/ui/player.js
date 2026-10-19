// Accessible custom controls retain the real audio element as the source of truth.
(() => {
  const players = new Map(), peakCache = new Map(), generations = new Map(), timers = new Map();
  const time = seconds => {
    seconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  function bars(svg, peaks = []) {
    svg.replaceChildren();
    for (let i = 0; i < 64; i++) {
      const peak = peaks[i] || .12, height = Math.max(6, peak * 76);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (i * 6.25 + 1).toFixed(2)); rect.setAttribute('y', ((84 - height) / 2).toFixed(2));
      rect.setAttribute('width', '4.1'); rect.setAttribute('height', height.toFixed(2)); svg.append(rect);
    }
  }
  function mount(shell) {
    const audio = shell.querySelector('audio'); if (!audio || players.has(audio)) return;
    const label = audio.getAttribute('aria-label') || 'recording';
    const root = document.createElement('div'); root.className = 'audio-player';
    const play = document.createElement('button'); play.type = 'button'; play.setAttribute('aria-label', `Play ${label}`); play.textContent = '▶';
    const wave = document.createElement('div'); wave.className = 'wave';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 400 84'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true'); bars(svg);
    const seek = document.createElement('input'); seek.type = 'range'; seek.min = '0'; seek.max = '100'; seek.value = '0'; seek.step = '1'; seek.setAttribute('aria-label', `Seek ${label}`); seek.setAttribute('aria-valuetext', '0:00 of 0:00');
    wave.append(svg, seek);
    const times = document.createElement('div'); times.className = 'player-time';
    const current = document.createElement('span'), duration = document.createElement('span'); current.textContent = '0:00'; duration.textContent = '0:00'; times.append(current, duration);
    const error = document.createElement('p'); error.className = 'player-error'; error.setAttribute('role', 'alert'); error.hidden = true;
    root.append(play, wave, times, error); shell.append(root);
    const render = () => {
      const progress = audio.duration ? audio.currentTime / audio.duration : 0;
      seek.value = String(Math.round(progress * 100)); current.textContent = time(audio.currentTime); duration.textContent = time(audio.duration);
      seek.setAttribute('aria-valuetext', `${time(audio.currentTime)} of ${time(audio.duration)}`);
      [...svg.children].forEach((bar, i) => bar.classList.toggle('done', i < progress * 64));
    };
    const reset = () => {
      play.disabled = false; seek.disabled = false; error.hidden = true; error.textContent = '';
      audio.currentTime = 0; bars(svg); render();
    };
    play.addEventListener('click', () => audio.paused ? audio.play().catch(() => {}) : audio.pause());
    seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = audio.duration * Number(seek.value) / 100; render(); });
    audio.addEventListener('play', () => { play.textContent = 'Ⅱ'; play.setAttribute('aria-label', `Pause ${label}`); });
    audio.addEventListener('pause', () => { play.textContent = '▶'; play.setAttribute('aria-label', `Play ${label}`); });
    audio.addEventListener('ended', () => { audio.currentTime = 0; render(); });
    audio.addEventListener('timeupdate', render); audio.addEventListener('loadedmetadata', render);
    audio.addEventListener('emptied', reset);
    audio.addEventListener('error', () => {
      play.disabled = true; seek.disabled = true; error.textContent = "This clip couldn't load"; error.hidden = false;
    });
    players.set(audio, {render, reset, svg});
  }
  document.querySelectorAll('.player-shell').forEach(mount);
  async function peaksFor(audio) {
    const source = audio.currentSrc || audio.src;
    if (!source) return null;
    if (peakCache.has(source)) return peakCache.get(source);
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error('Waveform decode unsupported');
    const context = new Context();
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error('Audio unavailable');
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const data = buffer.getChannelData(0), size = Math.ceil(data.length / 64);
      const peaks = Array.from({length:64}, (_, index) => {
        let max = 0;
        for (let i = index * size; i < Math.min(data.length, (index + 1) * size); i++) max = Math.max(max, Math.abs(data[i]));
        return max;
      });
      peakCache.set(source, peaks); return peaks;
    } finally { context.close(); }
  }
  async function decode(ids, token) {
    const audio = ids.map(id => document.getElementById(id));
    try {
      const peaks = await Promise.all(audio.map(peaksFor));
      if (generations.get(ids.join('|')) !== token || peaks.some(value => !value)) return;
      const max = Math.max(...peaks.flat(), .01);
      audio.forEach((item, index) => bars(players.get(item).svg, peaks[index].map(value => value / max)));
    } catch (_) {
      if (generations.get(ids.join('|')) === token) audio.forEach(item => players.get(item)?.render());
    }
  }
  function pair(ids, delay = 0) {
    const key = ids.join('|'), token = (generations.get(key) || 0) + 1;
    generations.set(key, token); ids.forEach(id => players.get(document.getElementById(id))?.reset());
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => decode(ids, token), delay));
  }
  window.hearsayPlayer = {refresh(id) { players.get(document.getElementById(id))?.render(); }, pair};
})();
