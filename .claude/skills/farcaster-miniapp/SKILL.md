---
name: farcaster-miniapp
description: >
  Build Farcaster Mini Apps for Startale App on Soneium chain using @farcaster/miniapp-sdk
  and @startale/app-sdk. Use this skill whenever the user wants to create, modify, debug,
  or understand a Farcaster Mini App targeting Startale App, including: setting up a new
  miniapp project, configuring the farcaster.json manifest, adding fc:miniapp embed meta
  tags, integrating the miniapp SDK, handling wallet connections via Startale connector
  on Soneium, implementing notifications (addMiniApp, webhook events, sending notifications),
  using SDK actions (composeCast, signIn, openUrl, viewProfile, swapToken, sendToken),
  reading sdk.context (including Startale-specific extensions like starPoints and eoaWallets),
  listening to SDK events, Quick Auth, share extensions, haptic feedback, back navigation,
  or publishing/discovery. Also trigger when the user mentions Frames v2, Startale miniapp,
  or Soneium miniapp. Do NOT confuse with Frames v1 which is a completely different technology.
---

# Farcaster Mini Apps for Startale App (Soneium)

Mini Apps are web apps (HTML/CSS/JS) that render inside Farcaster-compatible clients. This skill targets **Startale App** as the Farcaster client, running on the **Soneium** chain.

Startale App is a Farcaster client that extends the standard Mini App SDK context with Startale-specific data (STAR points, EOA wallets). It uses its own Wagmi connector (`@startale/app-sdk`) instead of the generic `@farcaster/miniapp-wagmi-connector`.

## Critical Rules

- **DO NOT** reference Frames v1 syntax (`fc:frame:image`, `fc:frame:button`). Mini Apps are NOT Frames v1.
- **DO NOT** invent manifest fields. Only use fields from the official schema.
- **ALWAYS** use `fc:miniapp` meta tag for new apps (not `fc:frame`, which is legacy-only).
- **ALWAYS** use `"version": "1"` (not `"next"`).
- **ALWAYS** call `sdk.actions.ready()` after the app loads — without it users see an infinite loading screen.
- The `addMiniApp()` action returns `void`. Notification details arrive via **events**, not return values.
- **Wallet connector**: Use `startaleConnector()` from `@startale/app-sdk`, NOT `farcasterMiniApp()` from `@farcaster/miniapp-wagmi-connector`. The target client is Startale App, not Warpcast.
- **Chain**: Always use `soneium` from `wagmi/chains`. This is the only supported chain.

## Project Setup

### Dependencies
```bash
npm install @farcaster/miniapp-sdk @startale/app-sdk wagmi viem @tanstack/react-query react react-dom
```

### Minimum viable app
```tsx
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    sdk.actions.ready()
  }, [])

  return <div>Hello Startale</div>
}
```

### Entry point (Buffer polyfill required)
```tsx
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi'
import App from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
```

## Wagmi Configuration (Startale + Soneium)

This is the correct wallet setup for Startale App:

```ts
import { startaleConnector } from "@startale/app-sdk"
import { http, createConfig } from "wagmi"
import { soneium } from "wagmi/chains"

export const config = createConfig({
  chains: [soneium],
  connectors: [startaleConnector()],
  multiInjectedProviderDiscovery: false,
  transports: {
    [soneium.id]: http()
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}
```

Key points:
- Use `startaleConnector()` — this connects to the Startale App wallet, NOT the generic Farcaster wallet
- Chain is `soneium` — this is the only chain this skill targets
- `multiInjectedProviderDiscovery: false` — prevents conflicts with other injected wallets
- No wallet selection dialog needed — Startale App handles connection

### Wallet interaction
Use standard Wagmi hooks: `useConnection()`, `useConnect()`, `useDisconnect()`, `useSignMessage()`, `useReadContract()`, `useWriteContract()`, `useWaitForTransactionReceipt()`.

## Manifest (`/.well-known/farcaster.json`)

Every Mini App needs a manifest. It identifies the app, verifies ownership, and enables notifications.

```json
{
  "accountAssociation": {
    "header": "...(base64url, signed by custody/auth address)...",
    "payload": "...(base64url, contains { domain })...",
    "signature": "...(base64url)..."
  },
  "miniapp": {
    "version": "1",
    "name": "My App",
    "iconUrl": "https://example.com/icon.png",
    "homeUrl": "https://example.com",
    "imageUrl": "https://example.com/preview.png",
    "buttonTitle": "Open",
    "splashImageUrl": "https://example.com/splash.png",
    "splashBackgroundColor": "#ffffff",
    "webhookUrl": "https://example.com/api/webhook",
    "description": "What the app does",
    "primaryCategory": "entertainment",
    "tags": ["tag1", "tag2"]
  }
}
```

Key fields:
- `accountAssociation`: Cryptographic proof linking domain to a Farcaster account. Generate via the [Manifest Tool](https://farcaster.xyz/~/developers/new).
- `webhookUrl`: Required for server-side notification token delivery. Optional if doing client-only notifications. If not needed, omit entirely (do not set to empty string).
- `homeUrl`: Where the app loads. Sub-paths from universal links get appended to this.

**Hosted manifests**: Farcaster can host manifests for you. Set up a redirect from `/.well-known/farcaster.json` to `https://api.farcaster.xyz/miniapps/hosted-manifest/{id}`.

## Embed Meta Tags (Sharing in Feeds)

Each shareable page needs an `fc:miniapp` meta tag in `<head>`:

```html
<meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://example.com/preview.png","button":{"title":"Open","action":{"type":"launch_frame","name":"My App","url":"https://example.com"}}}' />
```

- Image must be 3:2 aspect ratio, PNG/JPG/GIF/WebP, 600x400 to 3000x2000px, < 10MB
- Button title max 32 characters
- `action.type`: use `"launch_frame"` (or `"launch_miniapp"`)

## SDK Context

Access session info from `sdk.context` (it's a Promise due to Comlink):

```ts
const context = await sdk.context as {
  user?: { fid: number; username?: string; displayName?: string; pfpUrl?: string };
  client?: { clientFid: number; added: boolean; platformType?: string; safeAreaInsets?: SafeAreaInsets; notificationDetails?: { url: string; token: string } };
  location?: LocationContext;
  features?: { haptics: boolean; cameraAndMicrophoneAccess?: boolean };
  // Startale-specific extensions (only available in Startale App):
  startale?: { starPoints?: number; eoaWallets?: string[] };
}
```

### Startale-specific context
Startale App extends the standard Farcaster context with:
- `context.startale.starPoints` — user's STAR point balance
- `context.startale.eoaWallets` — array of user's EOA wallet addresses

These fields are NOT part of the standard Farcaster SDK and only available in Startale App.

### Standard context
- `context.user` — Farcaster user info (fid, username, pfpUrl)
- `context.client.notificationDetails` — existing `{ url, token }` if notifications enabled
- `context.client.added` — whether user has added the mini app
- `context.client.safeAreaInsets` — `{ top, bottom, left, right }` for mobile safe areas
- `context.location` — launch context: `cast_embed | cast_share | notification | launcher | channel | open_miniapp`

## SDK Actions

```ts
sdk.actions.ready()                    // REQUIRED: hide splash screen
sdk.actions.addMiniApp()               // Prompt user to add app (returns void!)
sdk.actions.close()                    // Close the mini app
sdk.actions.composeCast({ text, embeds, parent?, channelKey?, close? })
sdk.actions.signIn({ nonce, acceptAuthAddress? })
sdk.actions.openUrl(url)               // Open external URL
sdk.actions.openMiniApp({ url })       // Open another mini app (closes current)
sdk.actions.viewProfile({ fid })       // View a Farcaster profile
sdk.actions.viewCast({ hash })         // View a specific cast
sdk.actions.swapToken(...)             // Prompt token swap
sdk.actions.sendToken(...)             // Prompt token send
sdk.actions.viewToken(...)             // View token info
```

**Note**: Not all actions may be supported by Startale App. `sdk.actions.addMiniApp` support may vary — check Startale App compatibility docs. Use `sdk.getCapabilities()` to detect what's available at runtime.

## SDK Events (Client-Side)

The client emits events to your app via `sdk.on()` / `sdk.off()`:

```ts
// When user adds the mini app
sdk.on('miniAppAdded', ({ notificationDetails }) => {
  // notificationDetails?: { url: string; token: string }
  // Save these to enable sending notifications
})

// When user removes the mini app
sdk.on('miniAppRemoved', () => { })

// When user enables notifications (after previously disabling)
sdk.on('notificationsEnabled', ({ notificationDetails }) => {
  // notificationDetails: { url: string; token: string }
})

// When user disables notifications
sdk.on('notificationsDisabled', () => {
  // Invalidate stored tokens
})

// Back navigation
sdk.on('backNavigationTriggered', () => { })
```

Always clean up listeners:
```ts
useEffect(() => {
  const handler = (data) => { /* ... */ }
  sdk.on('miniAppAdded', handler)
  return () => sdk.off('miniAppAdded', handler)
}, [])
```

## Notifications

This is the most commonly misunderstood part. Read carefully.

### How notification tokens are delivered

There are TWO parallel paths for receiving notification tokens:

1. **Server-side (webhook)**: The Farcaster client POSTs events (`miniapp_added`, `notifications_enabled`, etc.) to your `webhookUrl`. This is the production pattern — store tokens in a database.

2. **Client-side (SDK events)**: The SDK emits `miniAppAdded` and `notificationsEnabled` events with `notificationDetails` directly to your running app. This works for demos/client-only apps.

Additionally, `sdk.context.client.notificationDetails` contains existing tokens if the user previously enabled notifications.

### Detecting notification support

Not all Farcaster hosts support notifications. Check `sdk.context.client.notificationDetails` on startup to detect whether the current host provides notification capabilities. If the property (or its `url`) is absent, the host does not support notifications and you should hide notification-related UI:

```ts
const context = await sdk.context
const hostSupportsNotifications = !!context?.client?.notificationDetails?.url

// Only show notification UI when the host supports it
if (hostSupportsNotifications) {
  // render notification controls
}
```

This is important because the same miniapp may run in different hosts — some (like Startale App) support notifications while testing environments may not. Gate notification UI on this check rather than always showing it.

### The correct addMiniApp pattern

```ts
// WRONG - addMiniApp returns void, not notification details
const result = await sdk.actions.addMiniApp()
result.notificationDetails // undefined!

// CORRECT - listen for the event
sdk.on('miniAppAdded', ({ notificationDetails }) => {
  if (notificationDetails) {
    // Save { url, token } - this is your notification credential
    saveNotificationDetails(notificationDetails)
  }
})
// Then trigger the prompt
await sdk.actions.addMiniApp()
```

### Sending a notification

POST to the `url` from notificationDetails:

```ts
await fetch(notificationDetails.url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: 'unique-id',       // For deduplication (24h window)
    title: 'App Name',                 // Notification title
    body: 'Message text',              // Notification body
    targetUrl: 'https://example.com',  // URL opened when tapped
    tokens: [notificationDetails.token] // Up to 100 tokens per request
  })
})
```

Rate limits: 1 per 30s per token, 100 per day per token.

### Client-only notification pattern (no backend)

For demos and simple apps without a server, you can store notification tokens in localStorage and send notifications client-side:

```ts
// On mount: check existing tokens from context
const context = await sdk.context
if (context.client?.notificationDetails) {
  localStorage.setItem('notif-details', JSON.stringify(context.client.notificationDetails))
}

// Listen for new tokens via events
sdk.on('miniAppAdded', ({ notificationDetails }) => {
  if (notificationDetails) {
    localStorage.setItem('notif-details', JSON.stringify(notificationDetails))
  }
})

// Enable notifications (prompts user)
await sdk.actions.addMiniApp()

// Send notification from client
const details = JSON.parse(localStorage.getItem('notif-details'))
if (details) {
  await fetch(details.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationId: `my-app-${Date.now()}`,
      title: 'My App',
      body: 'Hello!',
      targetUrl: window.location.href,
      tokens: [details.token]
    })
  })
}
```

### Server-side webhook pattern (production)

For the full reference on webhook verification and handling, see `references/webhooks-and-notifications.md`.

## Authentication

### Quick Auth (recommended)
```ts
const token = await sdk.quickAuth.getToken()
// Returns a JWT. Cached in memory, auto-refreshes when expired.

// Or use the fetch wrapper that adds Bearer token:
const response = await sdk.quickAuth.fetch('https://api.example.com/data')
```

### Sign In with Farcaster
```ts
const credential = await sdk.actions.signIn({ nonce: serverNonce, acceptAuthAddress: true })
// Verify on server with @farcaster/auth-client verifySignInMessage()
```

## Back Navigation

```ts
// Automatic web navigation integration (one line)
await sdk.back.enableWebNavigation()

// Or manual control
sdk.back.onback = () => { /* your back logic */ }
await sdk.back.show()
```

## Haptics

```ts
await sdk.haptics.impactOccurred('medium')      // light | medium | heavy | soft | rigid
await sdk.haptics.notificationOccurred('success') // success | warning | error
await sdk.haptics.selectionChanged()
```

Check support first:
```ts
const caps = await sdk.getCapabilities()
if (caps.includes('haptics.impactOccurred')) { ... }
```

## Share Extensions

Add `castShareUrl` to manifest to receive shared casts:

```ts
if (sdk.context.location?.type === 'cast_share') {
  const cast = sdk.context.location.cast
  // cast.author, cast.hash, cast.text, cast.embeds, etc.
}
```

## Environment Detection

```ts
const isMiniApp = await sdk.isInMiniApp()  // true if running inside a Farcaster client
```

## Capability Detection

```ts
const capabilities = await sdk.getCapabilities()
// Returns array of supported SDK method paths
// e.g. ['actions.composeCast', 'wallet.getEthereumProvider', 'haptics.impactOccurred']

const chains = await sdk.getChains()
// Returns CAIP-2 chain identifiers e.g. ['eip155:1868'] for Soneium
```

## Debugging & Testing

1. **Preview Tool**: `https://farcaster.xyz/~/developers/mini-apps/preview?url={encoded-url}`
2. **Embed Tool**: `https://farcaster.xyz/~/developers/mini-apps/embed`
3. **Debug Tool**: `https://farcaster.xyz/~/developers/mini-apps/debug`
4. Enable Developer Mode: `https://farcaster.xyz/~/settings/developer-tools`

**Important**: `addMiniApp()` only works on production domains matching the manifest. It fails on tunnel/dev domains.

## Common Pitfalls

1. **Infinite loading screen**: Forgot to call `sdk.actions.ready()`.
2. **addMiniApp fails on localhost/ngrok**: It requires production domain matching manifest.
3. **Trying to read return value of addMiniApp()**: It returns void. Listen to events instead.
4. **Missing Buffer polyfill**: Web3 libs need `import { Buffer } from 'buffer'; globalThis.Buffer = Buffer` before any other imports.
5. **SVG images in production**: Use PNG. SVGs may work in preview but fail in clients.
6. **Not cleaning up event listeners**: Always `sdk.off()` in useEffect cleanup.
7. **Using farcasterMiniApp connector**: For Startale App, use `startaleConnector()` from `@startale/app-sdk`, not the generic Farcaster connector.
8. **Wrong chain**: Always use `soneium` from `wagmi/chains`. Other chains are not supported in this context.
9. **Empty webhookUrl**: If not using webhooks, omit the field entirely instead of setting `""`.

## Reference Files

For detailed webhook/notification server implementation, see `references/webhooks-and-notifications.md`.
