# DarkLaunching

Chrome extension that manages LaunchDarkly flags for DOM elements on a target domain.

## API access token

Create a token under **Organization settings → Authorization → Access tokens**, then paste it into the extension’s LaunchDarkly API Key field. This is the account API token, not an environment SDK key or client-side ID.

A **Writer** role is enough. A Reader token can connect and list projects, but **Update Flags** will fail with a permissions error.

If your plan includes custom roles, choose **Inline policy** and use this policy instead of Writer. It covers the calls this extension makes: list projects and environments, list flags, create a flag, change its off variation, update its tags, and delete a flag.

```json
[
  {
    "effect": "allow",
    "actions": ["viewProject"],
    "resources": ["proj/*"]
  },
  {
    "effect": "allow",
    "actions": ["createFlag", "deleteFlag", "updateOffVariation", "updateTags"],
    "resources": ["proj/*:env/*:flag/*"]
  }
]
```

Replace `proj/*` with a project key, such as `proj/default`, if this token should only manage one project. Keep `:env/*` so every environment in the popup still works.

If creating a flag returns a 403, add `updateClientSideFlagAvailability`, `updateTags`, and `updateFlagDefaultVariations` to that second actions list. The extension sets client-side availability, ownership tags, and the off variation when it creates a flag.

## Architecture

DarkLaunching is a Manifest V3 extension with three parts. Only the first two can see the LaunchDarkly API key.

| Part | Where it runs | What it holds |
| --- | --- | --- |
| Popup | Extension page opened from the toolbar | Configuration UI, including the API key field |
| Service worker | Extension background | LaunchDarkly REST calls, host permissions, content-script registration |
| Content script | The target domain only, after you allow site access | Client-side SDK, DOM changes, and the user context |

The content script is injected only for the target domain you grant. It evaluates flags with the environment **client-side ID**. It does not call `https://app.launchdarkly.com` and it does not receive the API key.

## Data flow

1. You enter the API key in the popup. The popup stores it in extension-only storage and sends Connect, Refresh, and Update Flags as messages that do not include the key.
2. The service worker reads the key itself and calls the LaunchDarkly REST API. The `Authorization` header is attached only to requests whose origin is `https://app.launchdarkly.com`.
3. Connect saves the customer, target domain, project, environment, client-side ID, selectors, and user context. That saved record has no API key.
4. The service worker registers the content script for the granted target host. On that page, the script starts `@launchdarkly/js-client-sdk` with the client-side ID and the user context (`anonymous`, `os`, `browser`, `country`, `org`, `domain`, and any extra attributes).
5. Flag evaluation and DOM changes stay in the content script. Create, update, and delete flag calls stay in the service worker.
6. Analytics events from the page are relayed through the service worker to `https://events.launchdarkly.com`. The relay carries the client-side ID and the context. It does not carry the API key.

## Security

The LaunchDarkly API key stays inside DarkLaunching. It is not loaded into the target domain.

- The content script source and its built bundle do not contain the API key or `app.launchdarkly.com`.
- Messages sent to the target tab are limited to identify, reconfigure, and shutdown. None of them include the API key.
- The key is stored in `chrome.storage.session` with access level `TRUSTED_CONTEXTS`, so a content script cannot read it, and in IndexedDB on the extension origin (`chrome-extension://…`). A content script’s IndexedDB is the target page’s origin, not the extension’s.
- Any older copy under `chrome.storage.local` is removed. Content scripts can read that storage area, so the key is not left there.
- The target page receives the client-side ID only. That ID is what the client-side SDK uses to evaluate flags.

Export Config downloads a JSON file from the popup. That file contains the API key in plain text so you can import the configuration later. The download is not sent to the target domain.
