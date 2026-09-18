/**
 * Usuarios de prueba / acceso rápido.
 * Más adelante se reemplazará por login con contraseña propia.
 */
export const DEMO_USERS = [
  {
    email: "carolina@ccp.local",
    name: "Carolina Arellano",
    role: "pagos",
    roleLabel: "Administración",
  },
  {
    email: "paty@ccp.local",
    name: "Patricia Ibarra",
    role: "compras",
    roleLabel: "Compras",
  },
  {
    email: "helena@ccp.local",
    name: "Elena Maravilla",
    role: "contabilidad",
    roleLabel: "Contabilidad",
  },
  {
    email: "recepcion@ccp.local",
    name: "Daniela Reynoso",
    role: "recepcion",
    roleLabel: "Recepción",
  },
  {
    email: "diomedes@ccp.local",
    name: "Diomedes Arellano",
    role: "direccion",
    roleLabel: "Dirección",
  },
  {
    email: "daniel.arellano@ccp.local",
    name: "Daniel Arellano",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
  {
    email: "santiago@ccp.local",
    name: "Santiago Cortes",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
  {
    email: "sergio.casillas@ccp.local",
    name: "Sergio Casillas",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
  {
    email: "romario.ornelas@ccp.local",
    name: "Romario Ornelas",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
  {
    email: "eduardo.cortes@ccp.local",
    name: "Eduardo Cortes",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
  {
    email: "juan.bojorquez@ccp.local",
    name: "Juan Bojorquez",
    role: "ingeniero",
    roleLabel: "Ingeniería",
  },
] as const;

export type DemoUserEmail = (typeof DEMO_USERS)[number]["email"];

export const DEMO_USER_EMAILS = DEMO_USERS.map((u) => u.email) as readonly DemoUserEmail[];
