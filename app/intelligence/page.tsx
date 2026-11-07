import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { IntelligenceDashboard } from '../../components/intelligence/dashboard';
import './intelligence.css';
import './exploration.css';
import './pro.css';
import './floating-workspace.css';
import './workspace-controls.css';

const inter = localFont({
  src: '../../public/fonts/InterVariable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Situation overview | BARA Intelligence',
  description: 'Explore capture sessions, photos, and AI assessments from the connected BARA backend.',
};

export default function IntelligencePage() {
  return <div className={inter.variable}><IntelligenceDashboard /></div>;
}
