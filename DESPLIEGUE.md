# Despliegue CCP ERP en PC de oficina (LAN)

## Requisitos

- Windows 10/11 o Windows Server en la PC de la red local
- Node.js 20 LTS instalado
- Acceso LAN entre equipos de la oficina

## Instalación

1. Copiar la carpeta `ccp-erp-app` a la PC servidor (ej. `D:\CCP-ERP\app`).
2. Crear archivo `.env` basado en `.env.example`:
   - `DATABASE_URL="file:D:/CCP-ERP/data/prod.db"`
   - `FILES_ROOT="D:/CCP-ERP/files"`
   - `SESSION_SECRET` = cadena larga aleatoria única
   - `INITIAL_PASSWORD` = contraseña inicial (cámbiela tras el primer acceso)
3. En PowerShell (como administrador si hace falta):

```powershell
cd D:\CCP-ERP\app
npm install
npx prisma migrate deploy
npm run db:seed
npm run build
```

4. Iniciar en producción:

```powershell
npm run start -- -H 0.0.0.0 -p 3000
```

5. Desde otros equipos en la red: `http://IP-DE-LA-PC:3000`  
   (Obtener IP con `ipconfig` → IPv4, ej. `192.168.1.50`)

## Servicio permanente (Windows)

Usar **NSSM** o **PM2** para que la app arranque al encender la PC:

```powershell
npm install -g pm2
pm2 start npm --name ccp-erp -- start -- -H 0.0.0.0 -p 3000
pm2 save
pm2 startup
```

## Usuarios iniciales

| Correo | Rol |
|--------|-----|
| carolina@ccp.local | Pagos |
| paty@ccp.local | Compras |
| santiago@ccp.local | Ingeniero |
| recepcion@ccp.local | Recepción |
| helena@ccp.local | Contabilidad |

Contraseña inicial: la definida en `INITIAL_PASSWORD` (por defecto en desarrollo `ccp2026`).

**Acceso rápido (demo):** en la pantalla de login se puede entrar con un clic en cada usuario, sin contraseña. Desactivar con `ALLOW_QUICK_LOGIN=false` en `.env`.

## Vercel

Este proyecto **no está listo para Vercel solo con SQLite**. Ver [VERCEL.md](./VERCEL.md) (variables de entorno, base de datos y por qué falla el login).

## Respaldo (importante)

Programar copia diaria de:

- Carpeta `FILES_ROOT` (PDFs)
- Archivo SQLite de la base de datos (`prod.db`)

Ejemplo: copiar a disco externo o NAS con Robocopy / Tarea programada de Windows.

## Firewall

Permitir entrada TCP puerto **3000** solo desde la subred de la oficina (no exponer a Internet sin VPN).

## Actualizar la app

```powershell
cd D:\CCP-ERP\app
git pull   # o copiar archivos nuevos
npm install
npx prisma migrate deploy
npm run build
pm2 restart ccp-erp
```

## Soporte

Si la app no responde: verificar que Node/PM2 esté corriendo, que la PC esté encendida y que el firewall permita el puerto 3000 en la LAN.
