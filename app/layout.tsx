import type { Metadata } from 'next';
import './globals.css';
import { WelcomeModal } from './welcome-modal';
export const metadata: Metadata = {
  title: 'AI Loan Processing Agent',
  description: 'An interactive secured line of credit and human underwriting portfolio demo.',
};
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}<WelcomeModal/></body></html>;
}
