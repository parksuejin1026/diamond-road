import type { Metadata } from 'next';
import './globals.css';
import './redesign.css';
export const metadata: Metadata = { title: 'DIAMOND ROAD', description: '나의 첫 야구 커리어' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }
