'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { compassHeading } from '../../lib/witness';

export function useDevices() {
  const video = useRef<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((element: HTMLVideoElement | null) => { video.current = element; }, []);
  const stream = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const locationWatch = useRef<number | null>(null);
  const locationRequest = useRef(0);
  const compassCleanup = useRef<(() => void) | null>(null);
  const compassRequest = useRef(0);
  const compassPermissionPending = useRef(false);
  const [camera, setCamera] = useState<'closed' | 'loading' | 'ready' | 'error'>('closed');
  const [cameraError, setCameraError] = useState('');
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationOn, setLocationOn] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Not enabled');
  const [heading, setHeading] = useState<number | null>(null);
  const [compassOn, setCompassOn] = useState(false);
  const [compassStatus, setCompassStatus] = useState('Not enabled');

  function closeCamera() {
    cameraRequest.current++;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamera('closed');
  }

  async function openCamera() {
    closeCamera();
    const request = cameraRequest.current;
    setCamera('loading');
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS and a supported browser.');
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (request !== cameraRequest.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next;
      next.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (request !== cameraRequest.current) return;
        setCamera('error');
        setCameraError('Camera access was interrupted. Retry camera to continue.');
      }));
      if (video.current) {
        video.current.srcObject = next;
        await video.current.play();
      }
    } catch (error) {
      if (request !== cameraRequest.current) return;
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      setCamera('error');
      setCameraError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in your browser settings, then retry.'
        : error instanceof Error && !(error instanceof DOMException) ? error.message : 'No usable camera is available. Check that another app is not using it, then retry.');
    }
  }

  const stopLocation = useCallback(() => {
    locationRequest.current++;
    if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
    locationWatch.current = null;
    setLocationOn(false);
    setLocation(null);
    setLocationStatus('Not enabled');
  }, []);

  const startLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationStatus('Location is unavailable in this browser.'); return; }
    stopLocation();
    const request = locationRequest.current;
    setLocationOn(true);
    setLocationStatus('Waiting for location…');
    locationWatch.current = navigator.geolocation.watchPosition(position => {
      if (request !== locationRequest.current) return;
      setLocation(position.coords);
      setLocationStatus('Location available');
    }, error => {
      if (request !== locationRequest.current) return;
      stopLocation();
      setLocationStatus(error.code === 1 ? 'Location denied. Allow it in browser settings, then enable again.' : 'Location unavailable. Move only if safe, then enable again.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }, [stopLocation]);

  const stopCompass = useCallback(() => {
    compassRequest.current++;
    compassCleanup.current?.();
    compassCleanup.current = null;
    compassPermissionPending.current = false;
    setCompassOn(false);
    setHeading(null);
    setCompassStatus('Not enabled');
  }, []);

  const startCompass = useCallback(async () => {
    stopCompass();
    const request = compassRequest.current;
    if (typeof DeviceOrientationEvent === 'undefined') { setCompassStatus('This browser does not support a compass.'); return; }
    setCompassOn(true);
    setCompassStatus('Waiting for direction…');
    try {
      const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: (absolute?: boolean) => Promise<string> };
      if (orientation.requestPermission && await orientation.requestPermission(true) !== 'granted') throw new Error('Compass permission denied. Allow Motion & Orientation access, then try again.');
      if (request !== compassRequest.current) return;
      const timer = window.setTimeout(() => setCompassStatus('No compass heading received. Your device may not support absolute direction; stop and try again.'), 12000);
      const listener = (event: DeviceOrientationEvent) => {
        const value = compassHeading(event);
        if (value === null) return;
        window.clearTimeout(timer);
        setHeading(value);
        setCompassStatus('Direction available');
      };
      window.addEventListener('deviceorientationabsolute', listener);
      window.addEventListener('deviceorientation', listener);
      compassCleanup.current = () => {
        window.clearTimeout(timer);
        window.removeEventListener('deviceorientationabsolute', listener);
        window.removeEventListener('deviceorientation', listener);
      };
    } catch (error) {
      if (request !== compassRequest.current) return;
      compassPermissionPending.current = true;
      setCompassOn(false);
      setCompassStatus(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Tap Open camera or the compass to allow direction access.'
        : error instanceof Error ? error.message : 'Compass access failed. Please try again.');
    }
  }, [stopCompass]);

  function requestSensorPermissions() {
    if (compassPermissionPending.current) void startCompass();
  }

  useEffect(() => {
    const startup = window.setTimeout(() => {
      startLocation();
      void startCompass();
    }, 0);
    const release = () => {
      window.clearTimeout(startup);
      cameraRequest.current++;
      compassRequest.current++;
      locationRequest.current++;
      stream.current?.getTracks().forEach(track => track.stop());
      if (locationWatch.current !== null) navigator.geolocation.clearWatch(locationWatch.current);
      locationWatch.current = null;
      compassCleanup.current?.();
    };
    const hide = () => {
      release();
      setCamera('closed');
      setLocation(null);
      setLocationOn(false);
      setLocationStatus('Not enabled');
      setHeading(null);
      setCompassOn(false);
      setCompassStatus('Not enabled');
    };
    window.addEventListener('pagehide', hide);
    return () => { release(); window.removeEventListener('pagehide', hide); };
  }, [startLocation, startCompass]);

  return { video, requestSensorPermissions, attachVideo, camera, cameraError, openCamera, closeCamera, frameReady: () => {
    if (stream.current?.active && video.current && video.current.videoWidth > 0) setCamera('ready');
  }, location, locationOn, locationStatus, startLocation, stopLocation, heading, compassOn, compassStatus, startCompass, stopCompass };
}
