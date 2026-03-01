import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { DM_Sans, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/app/components/theme-provider';
import { QueryProvider } from '@/hooks/queries';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fieldrunner',
  description: 'Fieldrunner application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      taskUrls={{ 'choose-organization': '/choose-org' }}
      appearance={{
        elements: {
          formFieldRow__slug: { display: 'none' },
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${dmSans.variable} ${geistMono.variable} antialiased`}
        >
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
