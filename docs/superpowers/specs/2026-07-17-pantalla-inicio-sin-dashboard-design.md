# Pantalla de Bienvenida (`/inicio`) para usuarios sin permiso de dashboard

**Fecha:** 2026-07-17
**Estado:** Aprobado

## Problema

Los usuarios que **no** tienen el permiso `"dashboard"` quedan atrapados en un loop de
redirección al iniciar sesión y la app se vuelve inusable para ellos.

### Causa raíz

El problema real es que **todas las redirecciones post-login apuntaban a `/dashboard`
hardcodeado**, sin considerar si el usuario tiene ese permiso. Los puntos de fuga:

1. `components/login-form.tsx`: al enviar el formulario, `router.push("/dashboard")`
   (disparador principal tras un login exitoso).
2. `app/login/page.tsx`: si ya está autenticado, `router.replace("/dashboard")`.
3. `app/page.tsx` (raíz): si está autenticado, `router.replace("/dashboard")`.
4. `hoc/withAuth.tsx`: cuando el acceso es denegado, el *fallback* estaba hardcodeado a
   `/dashboard`, y el branch de "página anterior" (`previous`) podía regresar a
   `/login`.

El loop **login ↔ dashboard** para un usuario sin el permiso `dashboard`:
login exitoso → `/dashboard` → `withAuth` niega → branch `previous` = `/login` →
`/login` ve la sesión → `/dashboard` → … indefinidamente.

**Regla de arquitectura:** toda redirección post-autenticación debe pasar por una
única función (`getLandingRoute`), y ningún fallback de guard puede apuntar a una ruta
gateada ni a una ruta que a su vez redirige (`/login`, `/`, `/dashboard`).

## Objetivo

Dar a los usuarios sin dashboard una pantalla de aterrizaje **rápida y profesional**,
útil desde el día 1 (accesos directos a lo que sí pueden usar) y ampliable después
(espacio reservado para KPIs por rol). Eliminar el loop por construcción.

## Diseño

Cuatro piezas: un archivo nuevo + tres ediciones de una línea.

### 1. Helper `getLandingRoute(user)` — `lib/access/permissions.ts`

Única fuente de verdad de "a dónde mando a este usuario tras autenticarse / al ser
rechazado":

```ts
export function getLandingRoute(user: User | null | undefined): string {
  return hasPermission(user, "dashboard") ? "/dashboard" : "/inicio";
}
```

### 2. Nueva página `app/inicio/page.tsx`

`export default withAuth(InicioContent)` — **sin** código de permiso, por lo que
cualquier usuario autenticado pasa. Es una ruta segura (no gateada), lo que la hace
válida como destino de fallback.

Contenido, dentro de `<AppLayout>` (el sidebar sigue disponible):

- **Hero profesional:** saludo según la hora ("Buenos días/tardes/noches"), nombre del
  usuario, sucursal y fecha larga en español (`date-fns` + locale `es`).
- **Grid de accesos directos:** reutiliza el hook `useFilteredMenu()`. Aplana los items
  permitidos y renderiza una tarjeta por módulo (icono + título → `router.push(url)`).
  Excluye el propio link de dashboard.
- **Estado vacío:** si no hay módulos permitidos, mensaje "Aún no tienes módulos
  asignados. Contacta a tu administrador."
- **Placeholder reservado:** tarjeta tenue "Próximamente: información relevante para tu
  rol" para el crecimiento futuro.

### 3. Todas las redirecciones post-auth pasan por `getLandingRoute`

- `components/login-form.tsx`: `router.push(getLandingRoute(user.user))`.
- `app/login/page.tsx`: `router.replace(getLandingRoute(user))`.
- `app/page.tsx` (raíz): `router.replace(getLandingRoute(user))`.

### 4. Fix del loop en el guard — `hoc/withAuth.tsx`

- El fallback duro `/dashboard` → `getLandingRoute(user)`.
- El branch `previous` ahora ignora rutas que a su vez redirigen
  (`/login`, `/`, `/dashboard`) y cae a `getLandingRoute`. Elimina el rebote
  login ↔ dashboard por construcción.

## Fuera de alcance (YAGNI)

- Sin endpoint nuevo ni datos reales / KPIs.
- Sin tocar `DashboardWelcome` (el modal de resumen diario es una feature distinta).
- Sin cambios al catálogo de permisos.

## Verificación

- Usuario **con** `"dashboard"`: login → aterriza en `/dashboard` (sin cambios).
- Usuario **sin** `"dashboard"`: login → aterriza en `/inicio`, ve el hero + accesos a
  sus módulos, puede navegar; **no** hay loop.
- Navegar manualmente a `/dashboard` sin permiso → redirige a `/inicio` (no loop).
