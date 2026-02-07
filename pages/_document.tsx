import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        
        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        
        {/* Viewport: cover allows using full screen including notch / safe areas (iPhone X, etc.) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* PWA theme color - white for app-like appearance */}
        {/* Android: controls status bar and system UI color */}
        {/* Set for both light and dark mode to ensure white in all cases */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: dark)" />
        
        {/* iOS PWA settings */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* black-translucent: use full screen from top pixel; content uses safe-area padding */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Leptum" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
