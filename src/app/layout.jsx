import './globals.css';

export const metadata = {
  title: 'Shortfundly Campus Outreach Portal',
  description: 'Connecting Campuses. Empowering Creators. Manage college contacts, automate outreach, and build meaningful campus partnerships.',
  icons: {
    icon: '/sf_logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
