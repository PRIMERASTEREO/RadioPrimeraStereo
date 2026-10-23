/**
 * MiRadio.link - Core Engine (PRIMERA STEREO)
 * Logo oficial: Netlify (11.png) | Control de Jingles y Fallback de Carátula | Text Scroll
 */

let radioData = null;
let isPlaying = false;
let metadataTimer = null;
let currentTrack = '';

const $ = (id) => document.getElementById(id);

const LOCAL_RADIO_DATA = {
 
  slogan: 'Estás escuchando:',
  slug: 'primerastereo',
  audio_streaming_url: 'https://stream.laut.fm/primerastereo',
  logo_general_url: 'https://primera-stereo.netlify.app/11.png',
  metadata_api: 'https://api.laut.fm/station/primerastereo/current_song',
  android_primary_color: '#2563eb' // <-- PON AQUÍ EL AZUL (#2563eb)
};

const TemplateManager = {
  async mount(container) {
    container.innerHTML = `
      <style>
	  :root {
          --primary: #2563eb !important;
          --primary-rgb: 37, 99, 235 !important;
        }

        /* Tarjeta del reproductor sin resplandor naranja */
        .shell-status-card, .player-card {
          box-shadow: none !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          background: rgba(15, 23, 42, 0.75); /* Fondo oscuro semitransparente elegante */
          backdrop-filter: blur(10px);
        }

        /* Banner integrado en la parte superior de la tarjeta */
        .top-banner-img {
          width: 100%;
          max-width: 320px;
          height: auto;
          border-radius: 8px;
          margin-bottom: 16px;
          display: block;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        .song-box-container {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 14px;
          border-radius: 12px;
          margin-bottom: 20px;
          width: 100%;
          max-width: 280px;
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          position: relative;
        }

        .song-scroll-wrapper {
          overflow: hidden;
          width: 100%;
          white-space: nowrap;
          position: relative;
        }

        .song-scroll-text {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: #F8FAFC;
          white-space: nowrap;
          padding-left: 0;
          animation: marquee 12s linear infinite;
        }

        .song-scroll-text:hover {
          animation-play-state: paused;
        }

        @keyframes marquee {
          0% { transform: translateX(0%); }
          15% { transform: translateX(0%); }
          85% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      </style>

      <div class="shell-status-card" style="max-width:420px; margin: 0 auto; padding: 28px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; border-radius: 24px;">
	  <!-- BANNER INTEGRADO DENTRO Y ARRIBA EN EL PLAYER -->
        <img src="https://radioprimerastereo.netlify.app/102.png" class="top-banner-img" alt="PRIMERA STEREO">
        
        <div style="margin-bottom: 16px; position: relative;">
          <img src="${LOCAL_RADIO_DATA.logo_general_url}" id="station-cover" alt="Carátula" onerror="this.onerror=null; this.src='${LOCAL_RADIO_DATA.logo_general_url}';" style="width: 220px; height: 220px; border-radius: 20px; object-fit: cover; box-shadow: none;">
        </div>

        
        <p style="color: #00ccff; font-size: 13px; margin-bottom: 12px;">${LOCAL_RADIO_DATA.slogan}</p>
        
        <!-- Bloque de canción en vivo con Marquesina / Scroll -->
        <div class="song-box-container">
          <span style="color: var(--primary); font-size: 12px; font-weight: 700; flex-shrink: 0;">🎵</span>
          <div class="song-scroll-wrapper">
            <div id="current-song" class="song-scroll-text">Cargando metadatos...</div>
          </div>
        </div>

        <!-- Botón Reproducir / Pausa -->
        <button id="play-btn" style="background: #00ccff !important; border: none; color: #0f172a; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; margin: 0 auto 16px; box-shadow: 0 0 20px rgba(0, 229, 255, 0.5) !important; transition: transform 0.2s;">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="#0f172a"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>

        <!-- Control de Volumen -->
        <div style="width: 80%; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; background: rgba(0,0,0,0.2); padding: 8px 14px; border-radius: 20px;">
          <span style="font-size: 14px;">🔈</span>
          <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="1" style="width: 100%; cursor: pointer; accent-color: #00ccff !important;">
          <span style="font-size: 14px;">🔊</span>
        </div>

        <div>
          <span id="status-btn" style="font-size: 11px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 1px;">Listo para reproducir</span>
        </div>

      </div>
    `;
    bindTemplateActions();
  }
};

function bindTemplateActions() {
  const playBtn = $('play-btn');
  const volumeSlider = $('volume-slider');
  const audio = $('audio-player');

  if (playBtn) playBtn.onclick = () => togglePlay();

  if (volumeSlider && audio) {
    audio.volume = 1;
    volumeSlider.oninput = (e) => {
      audio.volume = parseFloat(e.target.value);
    };
  }
}

function setCoverImage(imageUrl) {
  const coverImg = $('station-cover');
  const ambientBg = $('ambient-bg');

  const finalUrl = imageUrl || LOCAL_RADIO_DATA.logo_general_url;

  if (coverImg) coverImg.src = finalUrl;
  if (ambientBg) ambientBg.style.backgroundImage = `url('${finalUrl}')`;
}

function fetchiTunesCoverJSONP(songQuery) {
  if (!songQuery) {
    setCoverImage(LOCAL_RADIO_DATA.logo_general_url);
    return;
  }

  const cleanQuery = songQuery
    .replace(/\(Live\)/gi, '')
    .replace(/\(Remix\)/gi, '')
    .replace(/ft\..*/gi, '')
    .trim();

  const callbackName = 'itunes_callback_' + Math.floor(Math.random() * 100000);

  window[callbackName] = function(data) {
    const scriptEl = $(callbackName);
    if (scriptEl) scriptEl.remove();
    delete window[callbackName];

    if (data && data.results && data.results.length > 0) {
      const coverUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      setCoverImage(coverUrl);
    } else {
      setCoverImage(LOCAL_RADIO_DATA.logo_general_url);
    }
  };

  const script = document.createElement('script');
  script.id = callbackName;
  script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&limit=1&callback=${callbackName}`;
  script.onerror = function() {
    delete window[callbackName];
    script.remove();
    setCoverImage(LOCAL_RADIO_DATA.logo_general_url);
  };
  document.body.appendChild(script);
}

async function fetchCurrentSong() {
  try {
    const res = await fetch(LOCAL_RADIO_DATA.metadata_api);
    if (!res.ok) return;
    const data = await res.json();
    
    const songEl = $('current-song');
    if (songEl && data) {
      const artist = (data.artist?.name || '').trim();
      const title = (data.title || '').trim();
      let songText = artist && title ? `${artist} - ${title}` : (title || artist || 'PRIMERA STEREO');

      // Detectar si es un jingle, promo o estación sin tema comercial
      const isJingle = !artist || !title || 
                       songText.toLowerCase().includes('jingle') || 
                       songText.toLowerCase().includes('promo') ||
                       songText.toLowerCase().includes('ident') ||
                       songText.toLowerCase().includes('primera stereo');

      if (isJingle) {
        songText = 'PRIMERA STEREO - En Vivo';
      }

      songEl.textContent = songText;

      // Reiniciar animación del texto scroll
      songEl.style.animation = 'none';
      void songEl.offsetWidth;
      songEl.style.animation = 'marquee 12s linear infinite';

      if (songText !== currentTrack) {
        currentTrack = songText;

        if (isJingle) {
          // Si suena un jingle, cargar directamente el logo de Netlify
          setCoverImage(LOCAL_RADIO_DATA.logo_general_url);
        } else {
          // Si laut.fm trae imagen propia usarla, de lo contrario buscar en iTunes
          const lautCover = data.image || data.album?.image || data.artist?.image || null;
          if (lautCover && typeof lautCover === 'string' && lautCover.startsWith('http')) {
            setCoverImage(lautCover);
          } else {
            fetchiTunesCoverJSONP(songText);
          }
        }
      }
    }
  } catch (err) {
    const songEl = $('current-song');
    if (songEl) songEl.textContent = 'PRIMERA STEREO - En Vivo';
    setCoverImage(LOCAL_RADIO_DATA.logo_general_url);
  }
}

function startMetadataPolling() {
  fetchCurrentSong();
  stopMetadataPolling();
  metadataTimer = setInterval(fetchCurrentSong, 12000);
}

function stopMetadataPolling() {
  if (metadataTimer) {
    clearInterval(metadataTimer);
    metadataTimer = null;
  }
}

async function init() {
  const shellStatus = $('shell-status');
  const appRoot = $('app-root');

  radioData = LOCAL_RADIO_DATA;

  if (shellStatus) shellStatus.style.display = 'none';
  if (appRoot) {
    appRoot.style.display = 'block';
    await TemplateManager.mount(appRoot);
  }

  document.title = `${radioData.name} - En Vivo`;
  if ($('ambient-bg')) $('ambient-bg').style.backgroundImage = `url('${radioData.logo_general_url}')`;
  
  fetchCurrentSong();
}

async function togglePlay() {
  const audio = $('audio-player');
  const playBtn = $('play-btn');
  const statusBtn = $('status-btn');

  if (!isPlaying) {
    audio.src = radioData.audio_streaming_url;
    try {
      await audio.play();
      isPlaying = true;
      
      if (playBtn) {
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="#0f172a"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      }
      if (statusBtn) {
        statusBtn.textContent = 'En Vivo • Reproduciendo';
        statusBtn.style.color = '#00ccff';
      }
      
      startMetadataPolling();
    } catch (e) {
      console.error('Error al reproducir audio:', e);
    }
  } else {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    isPlaying = false;
    
    if (playBtn) {
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    }
    if (statusBtn) {
      statusBtn.textContent = 'Pausado';
      statusBtn.style.color = '#94A3B8';
    }
    
    stopMetadataPolling();
  }
}

window.addEventListener('DOMContentLoaded', init);