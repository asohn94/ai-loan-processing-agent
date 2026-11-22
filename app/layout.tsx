import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI Loan Processing Agent',
  description: 'An interactive secured line of credit and human underwriting portfolio demo.',
};
export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
