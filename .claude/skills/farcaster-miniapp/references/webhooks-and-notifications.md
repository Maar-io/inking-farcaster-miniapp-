# Webhooks & Server-Side Notifications

## Overview

For production apps, notification tokens are delivered server-side via webhooks. The Farcaster client POSTs signed events to the `webhookUrl` in your manifest.

## Webhook Events

All events use [JSON Farcaster Signature](https://github.com/farcasterxyz/protocol/discussions/208) format:

```json
{
  "header": "base64url encoded",
  "payload": "base64url encoded",
  "signature": "base64url encoded"
}
```

Events are signed with the app key of the user, allowing verification of both the Farcaster client and the user.

### miniapp_added

Sent when user adds the Mini App. Adding includes enabling notifications.

```json
{
  "event": "miniapp_added",
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

`notificationDetails` is optional in the type but Warpcast always includes it.

### miniapp_removed

Sent when user removes the app. Invalidate all tokens for this fid+client.

```json
{
  "event": "miniapp_removed"
}
```

### notifications_enabled

Sent when user re-enables notifications after disabling.

```json
{
  "event": "notifications_enabled",
  "notificationDetails": {
    "url": "https://api.farcaster.xyz/v1/frame-notifications",
    "token": "a05059ef2415c67b08ecceb539201cbc6"
  }
}
```

### notifications_disabled

Sent when user disables notifications. Invalidate tokens.

```json
{
  "event": "notifications_disabled"
}
```

## Verifying Webhook Events

Use `@farcaster/miniapp-node`:

```bash
npm install @farcaster/miniapp-node
```

```ts
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from "@farcaster/miniapp-node"

// In your webhook handler:
try {
  const data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar)
  // data contains verified event with fid and event type
} catch (e: unknown) {
  const error = e as ParseWebhookEvent.ErrorType
  switch (error.name) {
    case "VerifyJsonFarcasterSignature.InvalidDataError":
    case "VerifyJsonFarcasterSignature.InvalidEventDataError":
      // Bad request data
      break
    case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
      // Invalid app key
      break
    case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
      // Transient error, retry
      break
  }
}
```

Requires `NEYNAR_API_KEY` environment variable (free tier available at neynar.com).

## Sending Notifications

POST to the `url` from notification details:

```ts
const response = await fetch(notificationUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notificationId: string,  // Unique ID for dedup (24h window per fid+notificationId)
    title: string,           // Notification title
    body: string,            // Notification body
    targetUrl: string,       // URL opened on tap (sets context.location to notification type)
    tokens: string[]         // Array of tokens, up to 100 per request
  })
})
```

### Response

HTTP 200 with JSON body containing results per token:
- `successTokens`: tokens that were notified
- `invalidTokens`: tokens that should be removed from your database
- `rateLimitedTokens`: tokens that hit rate limits, retry later

### Deduplication

The host deduplicates using `(fid, notificationId)` over a 24-hour window. Use stable IDs like `daily-reminder-2024-05-06` to safely retry.

### Rate Limits (Warpcast)

- 1 notification per 30 seconds per token
- 100 notifications per day per token

### Batching

Send the same notification to multiple users by including multiple tokens (up to 100) in a single request. Use the same `notificationId` across batches.

## When User Taps Notification

The Farcaster client:
1. Opens the Mini App at `targetUrl`
2. Sets `sdk.context.location` to:

```ts
{
  type: 'notification',
  notification: {
    notificationId: string,
    title: string,
    body: string
  }
}
```

## Managed Alternative

[Neynar](https://neynar.com) offers managed notification infrastructure:
- Handles webhook events and token storage
- API and portal for sending notifications
- Batching, targeting, analytics
- Docs: https://docs.neynar.com/docs/send-notifications-to-mini-app-users

## Reference Implementation

The official demo app has a complete working example:
- [Webhook handler](https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/app/api/webhook/route.ts)
- [Token storage (Redis)](https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/lib/kv.ts)
- [Notification sender](https://github.com/farcasterxyz/frames-v2-demo/blob/main/src/lib/notifs.ts)
