# User badges

Ketesa marks user avatars with a small emoji badge that signals the account type. The badge shows up anywhere an avatar appears: the users list, the user detail view, room member lists. Hover it to get a tooltip naming the role.

| Badge | Role | Appears on |
|-------|------|------------|
| 🧙 | You | Your own logged-in account |
| 🛡️ | System-managed | Appservice-managed accounts such as bridge puppets (see [system users](./system-users.md)) |
| 👑 | Admin | Homeserver administrators |
| 🌐 | Federated | Remote users from other homeservers |
| 🤖 | Bot | Local accounts with `user_type: bot` |
| 📞 | Support | Local accounts with `user_type: support` |
| 👤 | Regular | Local accounts with no other role |

A user can fit more than one of these, and only a single badge shows: the most specific one wins, working from the top of the table down, with your own account at the highest priority and a plain regular user at the bottom. The system-managed and "you" badges fold the underlying role into their tooltip, so a system-managed bot reads as "System-managed (Bot)" and your own admin account reads as "You (Admin)".
