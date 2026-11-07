import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { WitnessCamera } from '../../components/witness/camera';
import './witness.css';

const inter = localFont({ src: '../../public/fonts/InterVariable.woff2', variable: '--font-inter', display: 'swap', weight: '100 900' });

export const metadata: Metadata = {
  title: 'Camera preview | BARA Witness',
  description: 'A mobile preview of guided observation with BARA Witness. Photo submission and model services are not connected.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#130C0A' };

export default function WitnessPage() {
  return <div className={inter.variable}><WitnessCamera /></div>;
}
