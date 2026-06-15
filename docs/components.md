# Components

| Light | Dark |
|-------|------|
| ![Components (light)](./screenshots/light/components.webp) | ![Components (dark)](./screenshots/dark/components.webp) |

The Components page, under **Components** in the sidebar, is where you see what's running on your Matrix server and change it. It lists your active components and their monthly cost, shows the add-ons available to you, and lets you stage a set of changes and submit them as a support request without writing the ticket by hand. Nothing reaches your server until you submit.

## What's on your server

The **Your Server** card lists every component currently active (chat bridges, bots, apps, and whatever your plan includes), each with its monthly price.

## Available add-ons

The add-on sections (**Bridges**, **Extras**, **Matrix Apps**, **Matrix Bots**, **Matrix Extras**) list what you can add. A component covered by an active pack (the Bridges pack, for instance) shows as **Available**: it's part of the pack and costs nothing extra to turn on. Anything outside a pack shows its own monthly price.

## Staging and submitting changes

Toggle a component with the switch next to it; the row highlights to confirm it's staged. You can stage a dozen changes and undo them all again, and nothing touches your server until you submit.

The price strip along the bottom always shows your current monthly total. The moment you stage a change, a **preview** chip appears beside the total with the new figure, so the cost is in front of you before you commit to it.

When the selection is right, click **Request changes**. That opens a support ticket with your staged changes already filled in, and the [etke.cc](https://etke.cc) team applies them to your server.

## Labels

| Label | Meaning |
|-------|---------|
| **Included** (green, filled) | Part of your plan, no extra charge |
| **Free** (green, outlined) | Available at no cost, not yet enabled |
| **€X/mo** (green, outlined) | Available, costs this per month if added |
| **Available** (themed, outlined) | Covered by an active pack, enable at no extra charge |

Switch a component on and its label takes the primary accent (blue on the light theme, orange on the dark). Switching it off dims the label, marking it as a staged removal.

## Sections

Sections only appear when they have components available to your server, so you may see fewer than the table lists.

| Section | Contents |
|---------|----------|
| **Your Server** | Components currently active |
| **Bridges** | Protocol bridges to Slack, Discord, Telegram, WhatsApp, IRC, and others |
| **Extras** | Standalone add-ons and productivity services |
| **Matrix Apps** | Matrix applications and bots for your community |
| **Matrix Bots** | Automation bots for moderation, utilities, and integrations |
| **Matrix Extras** | Other Matrix-ecosystem services |

> This page is exclusive to [etke.cc](https://etke.cc) customers and isn't available in standalone Ketesa deployments.
