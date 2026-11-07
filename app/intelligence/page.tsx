import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { IntelligenceDashboard } from '../../components/intelligence/dashboard';
import './intelligence.css';
import './exploration.css';

const inter = localFont({
  src: '../../public/fonts/InterVariable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Situation overview | BARA Intelligence',
  description: 'Explore synthetic observations, their evidence, and what remains unresolved in the BARA Intelligence demo.',
};

export default function IntelligencePage() {
  return <div className={inter.variable}><IntelligenceDashboard /></div>;
}
