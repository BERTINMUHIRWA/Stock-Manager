import './globals.css';

export const metadata = {
  title: 'Boyz For Life',
  description: 'Plan a shared budget, record purchases and always know the remaining balance.',
};

export const viewport = {
  themeColor: '#0a4f3a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
