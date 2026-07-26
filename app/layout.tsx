import './globals.css';
export const metadata = { title: 'Sarvam Dub — Buildathon' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
