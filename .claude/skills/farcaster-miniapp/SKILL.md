---
name: farcaster-miniapp
description: >
  Build Farcaster Mini Apps — web apps that run inside Farcaster clients (Warpcast, etc.)
  with SDK access to wallet, notifications, authentication, social actions, and more.
  Use this skill whenever the user wants to create, modify, debug, or understand a
  Farcaster Mini App, including: setting up a new miniapp project, configuring the
  farcaster.json manifest, adding fc:miniapp embed meta tags, integrating the
  @farcaster/miniapp-sdk, handling wallet connections (EVM via Wagmi or Solana),
  implementing notifications (addMiniApp, webhook events, sending notifications),
  using SDK actions (composeCast, signIn, openUrl, viewProfile, swapToken, sendToken),
  reading sdk.context, listening to SDK events, Quick Auth, share extensions,
  haptic feedback, back navigation, or publishing/discovery. Also use when the user
  mentions Frames v2 (which is the old name for Mini Apps). Do NOT confuse with
  Frames v1 which is a completely different, older technology.
---

# Farcaster Mini Apps

Mini Apps are web apps (HTML/CSS/JS) that render inside Farcaster clients. They use the `@farcaster/miniapp-sdk` to access native Farcaster features: authentication, wallet, notifications, social actions.

## Critical Rules

- **DO NOT** reference Frames v1 syntax (`fc:frame:image`, `fc:frame:button`). Mini Apps are NOT Frames v1.
- **DO NOT** invent manifest fields. Only use fields from the official schema.
- **ALWAYS** use `fc:miniapp` meta tag for new apps (not `fc:frame`, which is legacy-only).
- **ALWAYS** use `"version": "1"` (not `"next"`).
- **ALWAYS** call `sdk.actions.ready()` after the app loads — without it users see an infinite loading screen.
- The `addMiniApp()` action returns `void`. Notification details arrive via **events**, not return values.

## Project Setup

### New project
```bash
npm create @farcaster/mini-app
```

### Existing project
```bash
npm install @farcaster/miniapp-sdk
```

### Minimum viable app
```tsx
import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    sdk.actions.ready()
  }, [])

  return <div>Hello Farcaster</div>
}
```

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
- `webhookUrl`: Required for server-side notification token delivery. Optional if doing client-only notifications.
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
const context = await sdk.context

context.user       // { fid, username?, displayName?, pfpUrl?, location? }
context.client     // { clientFid, added, platformType?, safeAreaInsets?, notificationDetails? }
context.location   // where app was launched from: cast_embed | cast_share | notification | launcher | channel | open_miniapp
context.features   // { haptics, cameraAndMicrophoneAccess? }
```

`context.client.notificationDetails` contains `{ url, token }` if the user already has notifications enabled. Use this on startup to check existing notification state.

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

## SDK Events (Client-Side)

The Farcaster client emits events to your app via `sdk.on()` / `sdk.off()`:

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

## Ethereum Wallet (Wagmi)

```bash
npm install wagmi viem @farcaster/miniapp-wagmi-connector @tanstack/react-query
```

```ts
import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [farcasterMiniApp()]
})
```

No wallet selection dialog needed — the Farcaster client handles wallet connection.

### Batch Transactions (EIP-5792)

```tsx
import { useSendCalls } from 'wagmi'

const { sendCalls } = useSendCalls()
sendCalls({
  calls: [
    { to: '0x...', value: parseEther('0.01') },
    { to: '0x...', data: encodeFunctionData({ abi, functionName: 'mint', args: [...] }) }
  ]
})
```

## Solana Wallet

```bash
npm install @farcaster/mini-app-solana @solana/wallet-adapter-react
```

```tsx
import { FarcasterSolanaProvider } from '@farcaster/mini-app-solana'

function App() {
  return (
    <FarcasterSolanaProvider endpoint={solanaEndpoint}>
      <Content />
    </FarcasterSolanaProvider>
  )
}
```

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
const isMiniApp = await sdk.isInMiniApp()  // true if running inside Farcaster client
```

## Capability Detection

```ts
const capabilities = await sdk.getCapabilities()
// Returns array of supported SDK method paths
// e.g. ['actions.composeCast', 'wallet.getEthereumProvider', 'haptics.impactOccurred']

const chains = await sdk.getChains()
// Returns CAIP-2 chain identifiers e.g. ['eip155:8453']
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
4. **Missing Buffer polyfill**: Some web3 libs need `import { Buffer } from 'buffer'; window.Buffer = Buffer`.
5. **SVG images in production**: Use PNG. SVGs may work in preview but fail in clients.
6. **Not cleaning up event listeners**: Always `sdk.off()` in useEffect cleanup.

## Reference Files

For detailed webhook/notification server implementation, see `references/webhooks-and-notifications.md`.
