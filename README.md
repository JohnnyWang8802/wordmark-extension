# WordMark — 每日生词本

Chrome MV3 extension for capturing, organizing, and reviewing English vocabulary while reading web pages.

## Features

- Double-click or select English words on web pages to look them up.
- Save words with definitions, pronunciation, source URL, and context sentence.
- Review saved words with a spaced-repetition flow.
- Browse today's words, history, tags, and mastered state.
- Export/import vocabulary as JSON, CSV, or Anki text.
- Optional page highlighting for saved words.

## Development

```bash
npm install
npm run dev
```

The dev server previews the popup UI at `http://localhost:5173/`.

## Build The Extension

```bash
npm run build
```

Load the generated `dist/` directory in Chrome:

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `dist/` directory.

## Quality Checks

```bash
npm test
npm run typecheck
npm run build
```

## Notes

The extension uses third-party dictionary, translation, and TTS endpoints. Requests include timeout, temporary-failure caching, and rate limiting to avoid repeated failed calls.

