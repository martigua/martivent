# Railway deployment

Railway builds the root `Dockerfile`. The same image is exercised by local
production-parity Compose and CI.

## One-time project setup

1. Create a Railway project and connect this GitHub repository on the `main`
   branch.
2. Add PostgreSQL and verify that its major version is 16. If the managed
   template no longer offers version 16, deploy the `postgres:16` image with a
   Railway volume instead of silently changing application versions.
3. Add these variables to the web service:

   | Variable               | Value                                                |
   | ---------------------- | ---------------------------------------------------- |
   | `SECRET_KEY`           | A generated, private value of at least 50 characters |
   | `DEBUG`                | `false`                                              |
   | `ALLOWED_HOSTS`        | The service's Railway public hostname                |
   | `DATABASE_URL`         | A reference to the PostgreSQL service's private URL  |
   | `GOOGLE_CLIENT_ID`     | Optional Google OAuth web client ID                  |
   | `GOOGLE_CLIENT_SECRET` | Optional matching Google OAuth secret                |

4. Generate a public domain for the web service.
5. If Google login is enabled, register
   `https://<public-host>/accounts/google/login/callback/` as an authorized
   redirect URI in Google Cloud Console.

Define both Google variables or neither. Incomplete credentials deliberately
stop application startup.

Password-reset and email-verification delivery also require a production email
provider. Configure that provider before treating either email workflow as
operational; provider selection and credentials are intentionally not encoded
in this repository.

## Deployment behavior

Pushes to `main` trigger Railway's GitHub autodeploy. Railway uses
`railway.json`, builds the root Dockerfile, starts the image entrypoint, applies
database migrations, and launches Gunicorn on Railway's injected `PORT`.

The deployment is accepted only after all of these checks succeed:

```text
GET /healthz       -> 200 and {"status": "ok"}
GET /              -> Angular home page
GET /auth/login    -> Angular deep link
GET /api/context/  -> public JSON context
GET /admin/        -> Django admin login
```

Check the deployment logs for migration or startup errors before directing
traffic to a new release.
