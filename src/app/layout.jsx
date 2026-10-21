import './globals.css';
import ProductionDebugBlocker from '@/components/ProductionDebugBlocker.jsx';

export const metadata = {
  title: 'Campus Email Automation Platform',
  description: 'Enterprise campus email outreach automation platform. Manage college contacts, personalize multi-region campaigns, and automate high-deliverability outreach.',
  icons: {
    icon: '/campus_icon.svg',
    shortcut: '/campus_icon.svg',
    apple: '/campus_icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ProductionDebugBlocker />
        {children}
      </body>
    </html>
  );
}
