import './globals.css';
export const metadata = {
  title: 'Thuna — Multilingual Digital Companion',
  description: 'A patient, safety-governed voice companion for elders.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
