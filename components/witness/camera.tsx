'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Camera, Check, ChevronRight, Compass, Info, MapPin, Maximize2, Minimize2, Settings2, ShieldCheck, Smartphone, X } from 'lucide-react';
import { BrandLogo, BrandLogoFilters } from '../landing/brand-logo';
import { captureBlock } from '../../lib/witness';
import { useDevices } from './use-devices';

const mobileQuery = '(max-width: 767px), (pointer: coarse) and (max-width: 1024px) and (max-height: 600px)';
const subscribeMobile = (callback: () => void) => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const topics = [
  { short: 'Flames', name: 'Visible flames', description: 'Whether identifiable flames are visible, not visible, or obscured.', limit: 'No visible flames in a photo does not establish that there is no fire.' },
  { short: 'Smoke', name: 'Visible smoke', description: 'Whether smoke is visible and its apparent source can be seen.', limit: 'Smoke drifting through an image does not establish its source.' },
  { short: 'Burning', name: 'What is burning', description: 'The visible material or object involved. Unknown is a valid finding.', limit: 'Suspected peat remains unconfirmed.' },
  { short: 'Location', name: 'Source location', description: 'Where the suspected source is relative to the witness.', limit: 'Your GPS records your position, not the fire location.' },
  { short: 'Time', name: 'Observation time', description: 'When the observation occurred and whether it describes the current situation.', limit: 'A capture timestamp alone does not answer every observation-time question.' },
  { short: 'Change', name: 'Change over time', description: 'Changes supported by observations made at different times.', limit: 'One photo cannot establish change over time. Smoke drift is not flame movement.' },
  { short: 'Threats', name: 'Immediate threats', description: 'Whether people, buildings, or roads are visibly affected.', limit: 'Information coverage is not a safety score or a measure of severity.' },
];
type Panel = 'controls' | 'guidance' | 'coverage' | number;

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
      <p>Open this page on your phone to explore the mobile UI preview.</p>
      <button className="bw-primary" onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopyStatus('Link copied'); }
        catch { setCopyStatus('Copy the address from your browser'); }
      }}>{copyStatus}<ArrowUpRight size={18} /></button>
      <span role="status" className="bw-sr">{copyStatus}</span>
      <Link className="bw-back" href="/"><ArrowLeft size={16} />Back to BARA</Link>
    </div>
    <p className="bw-desktop-note">Mobile UI preview · Photo submission is not connected.</p>
  </div>;
}

function MobileCamera() {
  const { camera, location, heading, closeCamera, attachVideo, frameReady, cameraError, openCamera, locationStatus, locationOn, stopLocation, startLocation, compassStatus, compassOn, stopCompass, startCompass } = useDevices();
  const sheet = useRef<HTMLDialogElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>('controls');
  const [serviceMessage, setServiceMessage] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable] = useState(() => Boolean(document.fullscreenEnabled));
  const [notice, setNotice] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

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

  function openPanel(next: Panel) {
    setPanel(next);
    setSheetOpen(true);
    sheet.current?.showModal();
  }
  const blocked = captureBlock(camera === 'ready', Boolean(location), heading !== null, online);
  const selected = typeof panel === 'number' ? topics[panel] : null;
  const direction = heading === null ? 'Direction off' : `${Math.round(heading) % 360}° ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8]}`;
  const panelTitle = selected?.name ?? (panel === 'controls' ? 'Camera controls' : panel === 'coverage' ? 'Observation coverage' : 'Camera instruction');

  return <div className="bw-camera" ref={shell}>
    <header className="bw-header">
      <div className="bw-identity"><BrandLogo /><span>Witness</span></div>
      <div className="bw-header-actions">
        <button className="bw-icon-button" aria-label="Open Controls" aria-haspopup="dialog" aria-expanded={sheetOpen && panel === 'controls'} onClick={() => openPanel('controls')}><Settings2 size={21} /></button>
        {fullscreenAvailable && <button className="bw-icon-button" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={async () => {
          try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); }
          catch { setNotice('Fullscreen is unavailable. You can continue in this view.'); }
        }}>{fullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}
        {camera !== 'closed' ? <button className="bw-icon-button" aria-label="Close camera" onClick={closeCamera}><X size={21} /></button> : <Link className="bw-icon-button" href="/" aria-label="Back to BARA"><X size={21} /></Link>}
      </div>
    </header>
    <div className="bw-session-bar"><span><i />No active session</span><button onClick={() => openPanel('controls')}>UI preview<Info size={14} /></button></div>

    <div className="bw-viewfinder">
      <video ref={attachVideo} autoPlay playsInline muted onLoadedData={frameReady} onPlaying={frameReady} aria-label="Live camera preview" className={camera === 'ready' ? 'bw-video is-ready' : 'bw-video'} />
      <div className="bw-aiming">
      <div className="bw-preview-status">
        {camera === 'ready' && <span className="bw-live">Live camera</span>}
        <button className="bw-coverage" aria-label="0 of 7 topics have information" aria-haspopup="dialog" onClick={() => openPanel('coverage')}><span>0 of 7 topics</span><ChevronRight size={16} /></button>
      </div>
      {camera !== 'ready' && <div className="bw-camera-empty" data-state={camera}>
        <Camera size={32} strokeWidth={1.5} />
        <h1>{camera === 'loading' ? 'Opening camera…' : camera === 'error' ? 'Camera unavailable' : 'Your perspective matters.'}</h1>
        <p>{camera === 'error' ? cameraError : camera === 'loading' ? 'Allow camera access when your browser asks.' : 'Document what you can see, from where you are.'}</p>
        {camera !== 'loading' && <button className="bw-primary" onClick={openCamera}><Camera size={18} />{camera === 'error' ? 'Retry camera' : 'Open camera'}</button>}
        <span className="bw-private">{camera === 'loading' ? 'You can close the camera at any time.' : 'Camera access starts only when you allow it.'}</span>
      </div>}
      <nav className="bw-topic-rail" aria-label="Observation topics">
        {topics.map((topic, index) => <button key={topic.short} aria-label={`${topic.name}: not assessed`} aria-haspopup="dialog" onClick={() => openPanel(index)}>
          <span className="bw-topic-circle" aria-hidden="true" /><span>{topic.short}</span>
        </button>)}
      </nav>
      </div>
      <section className="bw-guidance" aria-labelledby="bw-guidance-title">
        <div><h2 id="bw-guidance-title">Camera instruction</h2><button aria-label="Camera instruction details" onClick={() => openPanel('guidance')}><Info size={18} /></button></div>
        <p>Camera guidance will appear here.</p>
      </section>
    </div>

    <div className="bw-bottom">
      <div className="bw-capture">
        <p id="bw-capture-block" role="status">{blocked}</p>
        <div className="bw-shutter-row">
          <button className="bw-sensor" onClick={() => openPanel('controls')}><MapPin size={19} /><span>{location ? 'Location on' : 'Location off'}</span></button>
          <button className="bw-shutter" disabled aria-describedby="bw-capture-block" aria-label="Snap"><Camera size={26} /><span>Snap</span></button>
          <button className="bw-sensor" onClick={() => openPanel('controls')}><Compass size={19} /><span>{direction}</span></button>
        </div>
        <div className="bw-safety"><ShieldCheck size={15} /><span>Stay back. Observe from a safe position.</span></div>
        {(!online || notice) && <p className="bw-notice" role="status">{!online ? 'Offline — submission and live guidance are unavailable.' : notice}</p>}
      </div>
    </div>

    <dialog className="bw-sheet" ref={sheet} aria-labelledby="bw-sheet-title" onClose={() => setSheetOpen(false)} onClick={event => { if (event.target === sheet.current) sheet.current.close(); }}>
      <div className="bw-sheet-inner">
        <header><h2 id="bw-sheet-title">{panelTitle}</h2><button autoFocus className="bw-icon-button" aria-label="Close details" onClick={() => sheet.current?.close()}><X size={22} /></button></header>
        {panel === 'controls' && <>
          <p className="bw-preview-note">Try your device setup. Sessions, photo submission, and model assessments are not connected in this UI preview.</p>
          <section className="bw-control-group"><h3>Session</h3><p>No active session</p>
            <button className="bw-secondary" onClick={() => setServiceMessage('Sessions are unavailable in this preview. No session was created and no photo has been sent.')}>Start session<ArrowUpRight size={16} /></button>
            {serviceMessage && <p role="status" className="bw-service-message">{serviceMessage}</p>}
          </section>
          <section className="bw-control-group"><h3>Camera</h3><p>{camera === 'ready' ? 'Camera on · full frame shown' : camera === 'error' ? cameraError : camera === 'loading' ? 'Waiting for camera access…' : 'Camera closed'}</p>
            <button className="bw-secondary" onClick={camera === 'ready' || camera === 'loading' ? closeCamera : openCamera}>{camera === 'ready' || camera === 'loading' ? 'Close camera' : camera === 'error' ? 'Retry camera' : 'Open camera'}<Camera size={16} /></button>
          </section>
          <section className="bw-control-group"><h3>Witness location</h3><p>{locationStatus}</p>
            {location && <p className="bw-numeric">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±{Math.round(location.accuracy)} m</p>}
            <button className="bw-secondary" onClick={locationOn ? stopLocation : startLocation}>{locationOn ? 'Stop location' : 'Enable location'}<MapPin size={16} /></button>
            <p className="bw-control-help">Your position is not the suspected source location.</p>
          </section>
          <section className="bw-control-group"><h3>Compass</h3><p>{compassStatus}{heading !== null ? ` · ${direction}` : ''}</p>
            <button className="bw-secondary" onClick={compassOn ? stopCompass : startCompass}>{compassOn ? 'Stop compass' : 'Start compass'}<Compass size={16} /></button>
          </section>
          <p className="bw-control-help">Closing the camera releases camera access. Location and compass have separate stop controls. Leaving this page stops all three.</p>
        </>}
        {selected && <>
          <span className="bw-unknown"><span className="bw-topic-circle" />Not assessed</span>
          <p>{selected.description}</p>
          <dl className="bw-evidence"><div><dt>Session finding</dt><dd>No assessment available</dd></div><div><dt>Supporting photos</dt><dd>None submitted</dd></div><div><dt>Assessment time</dt><dd>Not available</dd></div></dl>
          <p>{selected.limit}</p>
          <p className="bw-preview-note">Coverage changes only when assessed evidence is received. You cannot mark a topic complete yourself.</p>
        </>}
        {panel === 'coverage' && <>
          <p>0 of 7 topics have information.</p><p>This checklist describes session-level information coverage, not safety or fire severity.</p>
          <ul className="bw-legend"><li><span className="bw-topic-circle" />Not assessed</li><li><span className="bw-topic-circle is-partial" />Needs more information</li><li><span className="bw-topic-circle is-complete"><Check size={17} /></span>Information available</li><li><span className="bw-topic-circle is-current" />Current instruction topic</li></ul>
          <p>An instruction ring is separate from coverage. A successful upload alone never completes a topic.</p>
        </>}
        {panel === 'guidance' && <>
          <p className="bw-preview-note">Model guidance is not connected in this preview.</p>
          <p>Camera guidance will appear here.</p><p>When connected, the guidance service supplies instructions on where to point your camera from your current position.</p>
          <p>No instruction has been received. Guidance is not required for capture once session and device setup are complete.</p>
          <button className="bw-secondary" disabled>Can’t get this view</button><p className="bw-control-help">Available when an active instruction is received and feedback is connected.</p>
        </>}
      </div>
    </dialog>
  </div>;
}
