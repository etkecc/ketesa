# User search

The Users list has a search box that matches against both the MXID and the display name.

By default it does a substring match: type `bot` and you get every user whose MXID or display name contains "bot". Prefixing the term with `!` inverts that. `!bot` returns the users whose MXID and display name both lack "bot".

Reverse search is heavier than a normal one. To exclude matches it scans the full user list instead of asking the server for a filtered page, so it runs slower, and the search box swaps its magnifying glass for an hourglass while it works. The behavior is the same on native Synapse and on MAS-backed deployments.
