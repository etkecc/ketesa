# Prefilling the login form

Ketesa's login form can take starting values from the URL's query string, so you can bookmark your setup or send someone a link that lands them on the right homeserver.

Two parameters work anywhere. `username` fills the username field, and `server` fills the homeserver URL field (a bare hostname gets a default protocol added if you leave one off). So `https://cloud.ketesa.app?username=admin&server=https://matrix.example.com` opens the credentials form with both fields ready.

## Local development only

`password` and `accessToken` prefill too, but only when Ketesa is served from `localhost` or `127.0.0.1`; everywhere else they're ignored on purpose. Anything in a URL is trivial to read back, so prefilling a credential outside local development would hand it to anyone who sees the link.

Passing `accessToken` also switches the form to access-token login:

```
http://localhost:8080?server=https://matrix.example.com&accessToken=secret
```

The `password` parameter fills the password field on the credentials form:

```
http://localhost:8080?username=admin&server=https://matrix.example.com&password=secret
```
