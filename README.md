This is a [Vite](https://vitejs.dev) project bootstrapped with [`@farcaster/create-mini-app`](https://github.com/farcasterxyz/frames/tree/main/packages/create-mini-app).

## `farcaster.json`

The `/.well-known/farcaster.json` is served from the [public
directory](https://vite.dev/guide/assets) and can be updated by editing
`./public/.well-known/farcaster.json`.

You can also use the `public` directory to serve a static image for `splashBackgroundImageUrl`.

Manage your Mini App on Farcaster here:
https://farcaster.xyz/~/developers/mini-apps

## Live App

```html
<iframe
  src="https://inking-farcaster-miniapp.vercel.app/"
  width="424"
  height="695"
  style="border: 1px solid #e5e7eb; border-radius: 12px;"
  title="Inking Farcaster Mini App"
></iframe>
```

## Mini App Embed

Add the `fc:miniapp` tag in `index.html` to make your root app URL sharable in feeds:

```html
  <head>
    <!--- other tags --->
    <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://inking-farcaster-miniapp.vercel.app/preview.svg","button":{"title":"Open","action":{"type":"launch_frame","name":"Inking","url":"https://inking-farcaster-miniapp.vercel.app/"}}}' />
  </head>
```
