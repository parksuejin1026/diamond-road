import type { Metadata } from 'next';
import './globals.css';
import './redesign.css';
import './completion.css';
import './career-v2.css';
import './career-v3.css';
import './career-v4.css';
import './career-v5.css';
export const metadata: Metadata = { title: 'DIAMOND ROAD', description: '나의 첫 야구 커리어', icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.svg` } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }
