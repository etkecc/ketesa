# Bulk CSV user import

Import creates Matrix accounts in bulk from a CSV file: prepare a spreadsheet, export it, upload it, and Ketesa provisions every row. It only ever creates accounts and never updates them, so an ID that already exists is a conflict to stop or skip on, never a record to modify. And every account it creates gets a password: the CSV's own if the row supplies one, a random password you never see if it doesn't. On native Synapse, decide how those users will receive credentials before you run; under Matrix Authentication Service, where login doesn't use these passwords, it matters less.

The whole thing runs in your browser. Parsing happens the moment you pick a file, and nothing reaches the server until you uncheck the dry run and start the real import.

## The CSV file

The first row is a header naming the columns. Names are case-insensitive and surrounding whitespace is ignored, so `ID `, `id`, and `Id` are one column, and column order doesn't matter. Two columns are required, and the import is refused outright if either is missing from the header:

| Column | Meaning |
|---|---|
| `id` | The user's Matrix ID, either a full MXID (`@alice:example.com`) or a bare localpart (`alice`) that gets your server's domain appended. Leave a row's value blank to have a random MXID generated for it. |
| `displayname` | The name shown in Matrix clients. |

Everything else is optional:

| Column | Meaning |
|---|---|
| `password` | Plaintext password. Blank gets a random one (see above). |
| `admin` | Server administrator. Boolean. |
| `is_guest` | Guest account. Boolean. |
| `deactivated` | Created already deactivated. Boolean. |
| `avatar_url` | An `mxc://` URI for the avatar image. |
| `user_type` | Synapse user type, such as `bot`, or a custom type your server defines. Blank means a regular user. |
| `threepids` | Third-party IDs as a comma-separated list of `medium:address` pairs, e.g. `email:alice@example.com,msisdn:+1234567890`. A pair not in that form is dropped silently. |

Booleans read `1`, `true`, `yes`, or `on` as true and `0`, `false`, `no`, `off`, `null`, `undefined`, or blank as false; case and spacing don't matter. Any other value, say `maybe`, is an error that rejects the whole file, so you hear about it before anything is created rather than after.

Any column beyond these is passed through to the server untouched. Two old names are the exception: `name` and `is_admin`, produced by earlier react-admin exports, are recognised and silently dropped. Use `id` and `admin` instead.

A small example:

```csv
id,displayname,password,admin,threepids
alice,Alice Example,s3cr3t,false,email:alice@example.com
bob,Bob Example,,false,
@carol:example.com,Carol Example,hunter2,true,email:carol@example.com
```

Bob's password column is blank, so Bob gets a generated one.

## Running an import

Open **Users** in the sidebar, then **Import**. Pick your file and it's parsed in the browser straight away, nothing sent yet. A stats card reports what it found: the row count, how many are flagged admin or guest, and how many carry an ID or a password, so you can catch a malformed file before it does anything.

A **conflict mode** dropdown sets what a clash with an existing account does (below). If any row carries an ID, a **user ID mode** dropdown also appears: keep those IDs (`update`, the default) or discard them all and generate random MXIDs instead (`ignore`).

Leave **Simulate only** checked for the first pass. A dry run does everything the real import does, parsing and conflict checks included, but creates nothing; if it reports no skipped rows, the real run won't skip any either, short of someone changing the server underneath you. Then uncheck **Simulate only** and run it again for real. Progress ticks by row.

Files over 100 MB are refused, to keep the browser from locking up. Split a larger import into chunks.

## Conflicts

A conflict is a row whose ID already belongs to a real account. Since the import can't modify an existing account, **conflict mode** picks one of two responses:

- **Stop**, the default, halts at the first clash. Everything before it is already created (or simulated), and the offending ID is named in the error. Use it when the file is meant to be all-new, so a collision means your data is wrong.
- **Skip** sets clashing rows aside and carries on. Reach for it to re-run a half-finished import, or when the file deliberately mixes new and existing users.

There is no update mode. To change existing accounts, use the user edit form or the user list's bulk actions. (In `ignore` ID-mode the IDs are all freshly random, so a collision there is just bad luck and the importer quietly re-rolls a new one rather than counting it as a conflict.)

## Results

When the run finishes, a results card replaces the controls: the total processed, the count created with their display names listed, and, only when some were set aside, the count skipped with a **Download skipped records** button. That file, `skippedRecords.csv`, is itself a valid import: it keeps each row's original columns, so fix what clashed and upload it again without weeding the successful rows out of your original. A dry run adds a banner reminding you nothing was actually created, and any error that halts a run shows in its own card above. **Back** returns to the user list.

---

See also: [User management](./user-management.md) · [Documentation index](./README.md)
