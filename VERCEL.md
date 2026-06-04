# Demo en Vercel (luz verde del flujo)

La app ya puede desplegarse en Vercel para **mostrar el proceso** (Paty → Santiago → Carolina → documentos). Necesitas una base **PostgreSQL gratuita** (Neon) y variables en Vercel.

## Resumen

| Entorno | Base de datos | PDFs |
|---------|---------------|------|
| **Vercel** | PostgreSQL (Neon) | Guardados en la BD (automático) |
| **PC oficina** | PostgreSQL o ver [DESPLIEGUE.md](./DESPLIEGUE.md) | Carpeta `FILES_ROOT` con `FILES_STORAGE=disk` |

---

## Paso 1 — Crear base en Neon (gratis)

1. Entra a [https://neon.tech](https://neon.tech) y crea cuenta.
2. **New Project** → nombre `ccp-erp-demo`.
3. Copia la **connection string** de PostgreSQL (modo *pooled* o *direct*; pooled suele ir bien en Vercel).
   - Debe verse así:  
     `postgresql://usuario:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Paso 2 — Variables en Vercel

En tu proyecto: **Settings → Environment Variables** (marca **Production**, **Preview** y **Development**):

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | La URL de Neon del paso 1 |
| `SESSION_SECRET` | Texto largo aleatorio (ej. 64 caracteres) |
| `INITIAL_PASSWORD` | `ccp2026` (solo para el seed en el build) |
| `ALLOW_QUICK_LOGIN` | `true` |
| `FILES_STORAGE` | `database` (opcional en Vercel; por defecto ya usa BD si detecta Vercel) |

No hace falta subir el archivo `.env` de tu PC.

---

## Paso 3 — Deploy

1. Conecta el repo a Vercel (carpeta raíz del proyecto: `ccp-erp-app` si el repo es el monorepo, o la raíz si solo está la app).
2. **Build Command:** deja el predeterminado; el script `vercel-build` en `package.json` ejecuta:
   - migraciones
   - seed (usuarios + obras de ejemplo)
   - build de Next.js
3. **Redeploy** después de guardar las variables.

---

## Paso 4 — Probar la demo

1. Abre la URL de Vercel → `/login`.
2. Clic en **Paty**, **Santiago**, **Carolina**, etc. (acceso rápido sin contraseña).
3. Recorre: crear obra/OC → aprobar ingeniero → fecha límite → pago → factura.

Usuarios del seed:

| Clic en login | Rol |
|---------------|-----|
| Paty | Compras |
| Santiago | Ingeniero |
| Rosa Carolina | Pagos |
| Recepción / Helena | Solo consulta y avisos |

---

## Desarrollo en tu PC (misma BD que Vercel)

Para probar localmente contra Neon:

```env
DATABASE_URL="postgresql://...tu-url-de-neon..."
SESSION_SECRET="local-dev-secret"
ALLOW_QUICK_LOGIN=true
FILES_STORAGE=database
```

```powershell
cd ccp-erp-app
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Para volver a PDFs en disco en la oficina más adelante: `FILES_STORAGE=disk` y `FILES_ROOT` en una ruta fija (ver DESPLIEGUE.md).

---

## Problemas frecuentes

**“Error al iniciar sesión” / base de datos**  
- Falta `DATABASE_URL` en Vercel o la URL es de SQLite (`file:./dev.db`). Debe ser `postgresql://...`.

**Build falla en migrate**  
- Revisa que Neon acepte conexiones y que la URL tenga `?sslmode=require`.

**PDF no se abre en Vercel**  
- Debe usarse almacenamiento en BD; confirma `VERCEL=1` o `FILES_STORAGE=database`.

**¿Sigue sirviendo solo local?**  
- No: con Neon + variables en Vercel la demo online funciona. La instalación en PC de oficina sigue siendo la opción recomendada para producción con archivos en disco.
