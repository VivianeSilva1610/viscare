import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

// This file is web-only and used to configure the root HTML for every web page during static rendering.
// The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-T2KKQ7JGYZ" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-T2KKQ7JGYZ');
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
