import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { WitnessCamera } from '../../components/witness/camera';
import './witness.css';

const inter = localFont({ src: '../../public/fonts/InterVariable.woff2', variable: '--font-inter', display: 'swap', weight: '100 900' });

export const metadata: Metadata = {
  title: 'Camera | BARA Witness',
  description: 'Capture observations with BARA Witness using your camera, location, and compass.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#130C0A' };

export default function WitnessPage() {
  return <div className={inter.variable}><WitnessCamera /></div>;
}
