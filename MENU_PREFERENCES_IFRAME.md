# Menu Preferences Iframe Messaging

This menu app can receive **MenuPreferences** updates from a parent page via `postMessage`. When a message is received, the menu updates **reactively** (theme, layout, category order, etc.).

## 1) Parent → Iframe (send)

From the parent page, get a reference to the iframe and post a message:

```js
const iframe = document.querySelector('iframe#menu');
const preferences = {
  themeColor: 'amber',
  darkMode: false,
  paperView: true,
  showPriceRange: true,
  expandOptions: false,
  coverPhotoUrl: null,
  logoUrl: null,
  footerText: 'Welcome!',
  categories: {
    1: { id: 'breakfast', label: 'Breakfast' },
    2: { id: 'sandwiches', label: 'Sandwiches' },
  },
  menuTypes: {
    1: {
      name: 'Main Menu',
      categorieArrangment: {
        1: 'breakfast',
        2: 'sandwiches',
      },
    },
  },
};

iframe.contentWindow?.postMessage(
  { type: 'menuPreferences', preferences },
  '*'
);
```

## 2) Accepted Message Shapes

The iframe will accept **any of these message formats**:

- `{ type: "menuPreferences", preferences: { ... } }`
- `{ menuPreferences: { ... } }`
- `{ preferences: { ... } }`
- `{ ...menuPreferencesFields }` (sending the object directly)

It will ignore messages that do **not** look like `MenuPreferences`.

## 3) MenuPreferences Fields

- `themeColor?: string` (e.g. `amber` or `#FFCC00`)
- `darkMode?: boolean`
- `paperView?: boolean`
- `showPriceRange?: boolean`
- `expandOptions?: boolean`
- `coverPhotoUrl?: string | null`
- `logoUrl?: string | null`
- `footerText?: string | null`
- `categories?: Record<string, { id: number | string; label?: string }>`
- `menuTypes?: Record<string, { name?: string; type?: string; images?: string[]; categorieArrangment?: Record<string, number | string> }>`

## 4) Notes

- Messages can be JSON strings too (the iframe will try to `JSON.parse`).
- **Security**: the current listener accepts messages from any origin (`*`). If you want origin validation, add an allow‑list check before applying preferences.

