# Despliegue en Vercel (limitaciones)

Este ERP fue diseñado para **un PC en la red de la oficina** con SQLite y PDFs en disco. En Vercel el login suele fallar aunque la contraseña sea correcta.

## Por qué falla el login en Vercel

1. **La base de datos no viaja en el deploy**  
   `prisma/dev.db` está en `.gitignore`. En Vercel no hay usuarios ni tablas → error 500 al iniciar sesión.

2. **SQLite en serverless no es adecuado**  
   Aunque subieras un `.db`, el sistema de archivos de Vercel es efímero y no sirve para producción con escrituras (sesiones, órdenes, PDFs).

3. **Variables de entorno**  
   Sí debes configurarlas en **Vercel → Project → Settings → Environment Variables** (no basta el `.env` local):

   | Variable | Obligatoria | Notas |
   |----------|-------------|--------|
   | `DATABASE_URL` | Sí | En Vercel use PostgreSQL (Neon, Supabase, Vercel Postgres), no `file:./dev.db` |
   | `SESSION_SECRET` | Sí | Cadena larga aleatoria (misma en Production) |
   | `FILES_ROOT` | Sí* | En Vercel los PDFs en disco local **no persisten**; hace falta S3/Blob más adelante |
   | `INITIAL_PASSWORD` | Solo al seed | Para `npm run db:seed` |
   | `ALLOW_QUICK_LOGIN` | Opcional | `true` (default) = acceso rápido sin contraseña; `false` para cerrarlo |

4. **Migraciones y seed en Vercel**  
   Tras cambiar a PostgreSQL hay que adaptar `schema.prisma` (`provider = "postgresql"`), ejecutar migraciones y seed en el proveedor de BD, no solo en build.

## Acceso rápido sin contraseña (demo)

Con `ALLOW_QUICK_LOGIN` distinto de `false`, los usuarios del seed pueden entrar con un clic en la pantalla de login (`POST /api/auth/quick-login`).

Solo funciona si **existe la base de datos con usuarios**. En Vercel sin BD configurada seguirá fallando con un mensaje más claro.

## Recomendación

- **Producción real:** PC de oficina según [DESPLIEGUE.md](./DESPLIEGUE.md).
- **Demo en internet:** Vercel + PostgreSQL gestionado + almacenamiento de archivos en la nube (trabajo aparte).

Para probar ya: `npm run dev` en tu PC con `npm run db:sync` y `npm run db:seed`.
