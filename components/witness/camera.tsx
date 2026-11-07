'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Camera, Compass, MapPin, Maximize2, Minimize2, Smartphone, X } from 'lucide-react';
import { BrandLogo, BrandLogoFilters } from '../landing/brand-logo';
import { captureBlock, witnessTopics } from '../../lib/witness';
import { useDevices } from './use-devices';
import { useSession } from './use-session';

const mobileQuery = '(max-width: 767px), (pointer: coarse) and (max-width: 1024px) and (max-height: 600px)';
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
export function WitnessCamera() {
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false);
  return <main className="bw"><BrandLogoFilters />{mobile ? <MobileCamera /> : <DesktopNotice />}</main>;
}

function DesktopNotice() {
  const [copyStatus, setCopyStatus] = useState('Copy mobile link');
  return <div className="bw-desktop">
    <Link href="/" aria-label="BARA home"><BrandLogo /></Link>
    <div className="bw-desktop-copy"><Smartphone size={40} strokeWidth={1.5} />
      <h1>Made for the<br />view from your phone.</h1>
      <p>BARA Witness uses your phone’s camera, location, and compass to help document what you see.</p>
      <p>Open this page on your phone to start a session and capture observations.</p>
      <button className="bw-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopyStatus('Link copied'); }
        catch { setCopyStatus('Copy the address from your browser'); }
      }}>{copyStatus}<ArrowUpRight size={18} /></button>
      <span role="status" className="bw-sr">{copyStatus}</span>
      <Link className="bw-back" href="/"><ArrowLeft size={16} />Back to BARA</Link>
    </div>
    <p className="bw-desktop-note">BARA Witness · Capture observations from your phone.</p>
  </div>;
}

function CriterionIndicator({ topic, selected, onSelect }: {
  topic: ReturnType<typeof witnessTopics>[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const previous = useRef(topic.confirmed);
  const [highlighted, setHighlighted] = useState(false);
  useEffect(() => {
    const newlyConfirmed = topic.confirmed && !previous.current;
    previous.current = topic.confirmed;
    if (!newlyConfirmed) return;
    const show = window.setTimeout(() => setHighlighted(true), 0);
    const collapse = window.setTimeout(() => setHighlighted(false), 4000);
    return () => { window.clearTimeout(show); window.clearTimeout(collapse); };
  }, [topic.confirmed]);
  const expanded = topic.confirmed && highlighted;
  return <button className={expanded ? 'is-newly-confirmed' : undefined} title={`${topic.name}: ${topic.label}`}
    aria-label={`${topic.name}: ${topic.label}`} aria-expanded={selected} aria-controls={selected ? 'bw-topic-detail' : undefined} onClick={onSelect}>
    <span className="bw-topic-label" aria-hidden="true">{topic.name} · Confirmed</span>
    <span className="bw-topic-circle" data-confirmed={topic.confirmed} aria-hidden="true" />
    <span className="bw-sr" role="status">{expanded ? `${topic.name} confirmed.` : ''}</span>
  </button>;
}

function MobileCamera() {
  const { video, requestSensorPermissions, camera, location, heading, closeCamera, attachVideo, frameReady, cameraError, openCamera, locationStatus, locationOn, stopLocation, startLocation, compassStatus, compassOn, stopCompass, startCompass } = useDevices();
  const { session, checking, busy, sending, message, guidance, startSession, endSession, capture, skipRequest } = useSession();
  const shell = useRef<HTMLDivElement>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable] = useState(() => Boolean(document.fullscreenEnabled));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    const screen = () => setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    document.addEventListener('fullscreenchange', screen);
    return () => {
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      document.removeEventListener('fullscreenchange', screen);
    };
  }, []);

  function startCamera() {
    if (checking || busy || sending || camera === 'loading' || !online) return;
    requestSensorPermissions();
    void openCamera();
    void startSession();
  }
  async function finishSession() {
    if (await endSession()) closeCamera();
  }
  function snap() {
    if (blocked || !video.current || !location || heading === null) return;
    void capture(video.current, {
      time: new Date().toISOString(),
      location: { latitude: location.latitude, longitude: location.longitude },
      direction: heading,
    });
  }
  const blocked = captureBlock(camera === 'ready', Boolean(location), heading !== null, online, session?.status === 'active', checking || busy || sending);
  const direction = heading === null ? 'Compass' : `${Math.round(heading) % 360}°`;
  const topics = witnessTopics(session?.checklist);
  const selected = topics.find(topic => topic.key === selectedTopic);
  const canSkip = session?.instruction?.status === 'ready' && Boolean(session.instruction.gapId)
    && session.instruction.checklistRevision !== undefined && !session.instruction.gapId?.startsWith('camera_to_fire_distance.');
  const sessionStatus = checking ? 'Checking session…' : busy ? 'Updating session…' : session ? 'Session active' : 'Witness';
  const sensorHint = camera === 'ready' && session
    ? !location ? locationStatus : heading === null ? compassStatus : ''
    : '';
  const hint = sending ? 'Saving snapshot…' : message || notice || (!online ? 'Offline. Reconnect to send photos.' : sensorHint || (camera === 'ready' ? blocked : ''));

  return <div className="bw-camera" ref={shell}>
    <header className="bw-header">
      <span className="bw-session-status" role="status"><i data-active={Boolean(session)} />{sessionStatus}</span>
      <div className="bw-header-actions">
        {session && <button className="bw-end-session" disabled={checking || busy || sending || !online} onClick={finishSession}>End session</button>}
        {!session && camera === 'ready' && <button className="bw-end-session" disabled={checking || busy || sending || !online} onClick={() => { requestSensorPermissions(); void startSession(); }}>Retry session</button>}
        {fullscreenAvailable && <button className="bw-icon-button" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={async () => {
          try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); }
          catch { setNotice('Fullscreen is unavailable.'); }
        }}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>}
        {camera !== 'closed' ? <button className="bw-icon-button" aria-label="Close camera" onClick={closeCamera}><X size={17} /></button> : <Link className="bw-icon-button" href="/" aria-label="Back to BARA"><X size={17} /></Link>}
      </div>
    </header>

    <div className="bw-viewfinder">
      <video ref={attachVideo} autoPlay playsInline muted onLoadedData={frameReady} onPlaying={frameReady} aria-label="Live camera preview" className={camera === 'ready' ? 'bw-video is-ready' : 'bw-video'} />
      <div className="bw-aiming">
        {camera !== 'ready' && <div className="bw-camera-empty" data-state={camera}>
          <Camera size={28} strokeWidth={1.5} />
          <h1>{camera === 'loading' ? 'Opening camera…' : camera === 'error' ? 'Camera unavailable' : 'Your perspective matters.'}</h1>
          <p>{camera === 'error' ? cameraError : camera === 'loading' ? 'Allow camera access when your browser asks.' : 'Document what you can see, from where you are.'}</p>
          {camera !== 'loading' && <button className="bw-primary" disabled={checking || busy || sending || !online} onClick={startCamera}><Camera size={17} />{camera === 'error' ? 'Retry camera' : 'Open camera'}</button>}
          <span className="bw-private">Opening the camera starts your observation session.</span>
        </div>}
        <nav className="bw-topic-rail" aria-label="Observation topics">
          {topics.map(topic => <CriterionIndicator key={`${session?.id ?? 'setup'}:${topic.key}`} topic={topic}
            selected={selectedTopic === topic.key} onSelect={() => setSelectedTopic(selectedTopic === topic.key ? null : topic.key)} />)}
        </nav>
        {selected && <aside className="bw-topic-detail" id="bw-topic-detail" aria-label={selected.name}>
          <div><h2>{selected.name}</h2><button className="bw-icon-button" aria-label="Close topic details" onClick={() => setSelectedTopic(null)}><X size={16} /></button></div>
          <p>{selected.description}</p><span>{selected.label}</span>
        </aside>}
      </div>
      {guidance && <section className="bw-guidance" aria-label="Camera instruction">
        <div className="bw-guidance-heading"><h2>Camera instruction</h2>{canSkip && <button className="bw-skip-request" disabled={checking || busy || sending || !online} onClick={skipRequest}>Skip request</button>}</div>
        <p role="status">{guidance}</p>
      </section>}
    </div>

    <footer className="bw-bottom">
      <div className="bw-shutter-row">
        <button className="bw-sensor" title={locationStatus} aria-label={locationOn ? 'Stop GPS' : 'Enable GPS'} aria-pressed={locationOn} onClick={locationOn ? stopLocation : startLocation}><MapPin size={16} /><span>{location ? 'GPS on' : locationOn ? 'Locating…' : 'GPS off'}</span></button>
        <button className="bw-shutter" disabled={Boolean(blocked)} onClick={snap} aria-describedby="bw-capture-block" aria-label="Snap" aria-busy={sending}><Camera size={22} /><span>{sending ? 'Sending…' : 'Snap'}</span></button>
        <button className="bw-sensor" title={compassStatus} aria-label={compassOn ? 'Stop compass' : 'Enable compass'} aria-pressed={compassOn} onClick={compassOn ? stopCompass : startCompass}><Compass size={16} /><span>{direction}</span></button>
      </div>
      <p id="bw-capture-block" role="status" className={hint ? 'bw-notice' : 'bw-sr'}>{hint || blocked || 'Ready to capture.'}</p>
    </footer>
  </div>;
}
