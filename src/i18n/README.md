# i18n/

Internationalization. 10 languages, each in its own directory.

## Structure

- `index.ts`: i18n provider setup (do not modify for new translations)
- `types.d.ts`: Type-safe translation key definitions
- `en/`, `de/`, `fa/`, `fr/`, `it/`, `ja/`, `pt/`, `ru/`, `uk/`, `zh/`: one dir per language

Each language directory contains:
- `index.ts`: assembles all domain files into the full translation object
- `base.ts`: vendored react-admin (`ra.*`) messages, present in de, fa, it, ja, pt, ru, uk, zh;
  `en` and `fr` spread `ra-language-english` / `ra-language-french` instead.
- `common.ts`: spreads the base messages, then adds `ketesa.*` and other app-level strings
- `users.ts`: `resources.users.*`
- `rooms.ts`: `resources.rooms.*`
- `mas.ts`: all `resources.mas_*` keys
- `reports.ts`: `resources.reports.*`
- `user_reports.ts`: `resources.user_reports.*`
- `misc_resources.ts`: all remaining resource keys

## Adding a translation key

1. Add the type to `types.d.ts`
2. Add the English string to `en/<domain>.ts`
3. Add a proper native-quality translation to **every** other language's `<domain>.ts`

All languages must stay in sync. Never use English stubs in non-English files.
