import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        {/* PWA theme colors for light and dark mode */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#020817" media="(prefers-color-scheme: dark)" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
