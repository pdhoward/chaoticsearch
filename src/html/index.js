import React from 'react'
import serialize from 'serialize-javascript'

const HTML = ({ content, store }) => (
  <html>
    <head>
        <meta charSet="utf8"/>
          <title>ChaoticBots</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" />
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css" />
          <link rel="icon" href="./favicon.ico" type="image/x-icon" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    </head>
    <body>
    <div>
      <div id="root" dangerouslySetInnerHTML={{ __html: content }}/>
      <div id="devtools"/>
      <script dangerouslySetInnerHTML={{ __html: `window.__initialState__=${serialize(store.getState())};` }}/>
      <script src="/dist/bundle.js"/>
    </div>
    </body>
  </html>
)

export {HTML}
