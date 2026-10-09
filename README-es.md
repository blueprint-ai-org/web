# lti-server-test (explicación en español)

Versión resumida y en español del [`README.md`](./README.md). Para detalles
de instalación paso a paso ver [`INSTALL.md`](./INSTALL.md).

---

## ¿Qué es esto?

Una **herramienta LTI 1.3** que Canvas (el LMS) embebe dentro de un
iframe en un curso. Cuando alguien hace clic en la app desde Canvas, este
servidor:

1. Verifica que el clic viene realmente de Canvas.
2. Le entrega al usuario una pequeña SPA hecha con **React Router 7**.

Todo corre en un único proceso Express:

- **Boilerplate LTI** (claves RSA, JWKS, registro de plataformas) → librería [`ltijs`](https://github.com/Cvmcosta/ltijs).
- **Login/launch cookieless** (Safari, Firefox) → handlers propios en `lti/cookieless.ts`.
- **UI post-launch** (`/app`) → React Router 7 en SSR.

---

## Cómo se conecta con Canvas

### Instalación en Canvas

Hay dos caminos para instalar la herramienta. Ambos comparten el shape de
los placements vía `lti/tool-config.ts` para que no diverjan:

- `GET /lti/register` → **Dynamic Registration** (recomendado). El admin
  pega esa URL en Canvas y este crea la Developer Key automáticamente.
  Implementado en `lti/dynamic-registration.ts`.
- `GET /lti-config.json` → **JSON manual** para Canvas antiguos.
  Implementado en `lti/config-json.ts`.

Ambos exponen los mismos endpoints públicos:

- `…/lti/login` — OIDC initiation
- `…/lti/launch` — target link URI
- `…/.well-known/jwks.json` — clave pública del tool

### Flujo de launch (cookieless)

Es el flujo por defecto. `ltijs` sigue montado pero solo se encarga de
JWKS, dynamic registration y persistencia de claves; el login y el launch
los manejamos nosotros porque Safari ITP y Firefox Strict ETP bloquean la
cookie de estado del flujo OIDC clásico.

```mermaid
sequenceDiagram
    participant Canvas
    participant Tool as Tool (este servidor)
    participant Store as Canvas Platform Store
    Canvas->>Tool: POST /lti/login (login_hint, lti_storage_target)
    Tool-->>Canvas: HTML (lti.put_data nonce -> Store; auto-POST auth req)
    Canvas->>Tool: POST /lti/launch (id_token)
    Tool-->>Canvas: HTML (lti.get_data nonce <- Store; POST /lti/validate)
    Tool->>Tool: verify id_token vía jose + JWKS; firma lti-claims; 302 /app
```

Paso a paso:

1. Canvas hace `POST /lti/login` con `login_hint` + `lti_storage_target`.
2. Respondemos **HTML** que guarda el `nonce` en el *Platform Storage* de
   Canvas vía `postMessage` (`lti.put_data`) y luego auto-postea la auth
   request a Canvas.
3. Canvas devuelve `POST /lti/launch` con un `id_token` (JWT firmado por
   Canvas).
4. Respondemos otro HTML que recupera el `nonce` con `lti.get_data` y
   postea `(state, id_token, nonce)` a `/lti/validate`.
5. `/lti/validate` verifica el `id_token` contra la JWKS de Canvas con
   `jose`, consume el nonce y hace `302 /app?lti_session=<jwt>`.

Si Canvas no manda `lti_storage_target` (caso legacy), nuestros handlers
llaman a `next()` y Express cae en el flujo cookie clásico de `ltijs` sin
cambios.

---

## Cómo se autentica la sesión

Hay dos niveles de autenticación:

### 1. Confianza en Canvas

El `id_token` que manda Canvas es un JWT firmado con su clave privada.
`lti/verify.ts` lo valida contra la **JWKS pública de Canvas**:

- firma RSA,
- `iss` coincide con `CANVAS_ISSUER`,
- `aud` coincide con `CANVAS_CLIENT_ID`,
- `exp` no vencido,
- `nonce` coincide con el que guardamos en Mongo.

Si pasa, sabemos que la persona viene autenticada por Canvas.

### 2. Sesión propia para el frontend

En `/lti/validate`, una vez verificado el `id_token`, firmamos un
**JWT HS256 `lti-claims`** (TTL 1h, secreto = `LTI_KEY`) con los claims
útiles. Lo entregamos por **dos vías** simultáneas:

- cookie `lti-claims` → funciona en Chrome.
- URL: `/app?lti_session=<jwt>` → funciona en Safari, que tira la cookie
  en contexto iframe.

El loader de React Router (`app/lib/lti-session.server.ts`) **prefiere el
token de la URL** sobre la cookie, así que un launch fresco siempre gana
sobre una cookie vieja. En el primer render, un `useEffect` hace
`history.replaceState({}, '', '/app')` para limpiar el JWT de la URL
visible y del historial.

**No hay sesión persistida en servidor**: el JWT *es* la sesión.

> Caveat: el JWT aparece brevemente en logs de edge (Railway, Cloudflare)
> en el request `/app?lti_session=…`. Mitigado por el TTL de 1h y HTTPS.

---

## Qué guarda en MongoDB

Mongo se usa para **dos cosas completamente separadas**:

### 1. Colecciones que gestiona `ltijs` (no las tocamos)

`lti.setup(LTI_KEY, { url: MONGODB_URL }, …)` en `lti/provider.ts` le pasa
la conexión a ltijs, que mantiene:

- **`publickey` / `privatekey`** — el par RSA que exponemos en
  `/.well-known/jwks.json`. Persistido para que un restart no invalide la
  JWKS cacheada por Canvas.
- **`platform`** — plataformas Canvas registradas (issuer, client_id,
  endpoints de auth, URL del JWK_SET). Se popula con
  `lti.registerPlatform(...)` al arrancar o vía dynamic registration.
- **`platformStatus`**, **`accesstoken`**, **`idtoken`**,
  **`contexttoken`**, **`nonce`** (este último es el nonce store del
  flujo *cookie legacy* de ltijs, no del nuestro), más alguna colección
  interna de bookkeeping.

Son detalles de implementación de ltijs. Tratar como opacas — ver los
[docs de ltijs](https://cvmcosta.me/ltijs/#/) para el schema.

### 2. Nuestra colección `lti_nonces` (flujo cookieless)

`lti/nonce-store.ts` escribe un documento por cada login cookieless:

```ts
{
  nonce: string,    // valor opaco aleatorio
  state: string,    // parámetro OIDC state
  createdAt: Date   // anchor para el TTL
}
```

Índices:

- `{ nonce: 1, state: 1 }` único.
- `{ createdAt: 1 }` con `expireAfterSeconds: 120` → Mongo borra el doc a
  los ~2 minutos si nadie lo consume antes.

Ciclo de vida:

1. `POST /lti/login` genera `(nonce, state)` y hace `upsert` en
   `lti_nonces` vía `saveNonce`.
2. Canvas mueve esos valores por su Platform Store vía `lti.put_data` /
   `lti.get_data`.
3. `POST /lti/validate` llama a `consumeNonce`, que hace
   `findOneAndDelete`. Gana la primera llamada (protección anti-replay);
   cualquier llamada posterior con el mismo par devuelve `false`.

Usamos Mongo en lugar de un `Map` en memoria para que el flujo sobreviva
a deploys multi-instancia detrás de un load balancer y para tener TTL
aunque el usuario cierre la pestaña entre `login` y `launch`.

**Lo que NO se guarda en servidor**: el JWT `lti-claims` post-launch. Vive
solo en cookie + URL.

---

## Variables de entorno (resumen)

Crear `.env` en este directorio:

| Variable           | Requerida | Para qué                                                         |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `LTI_KEY`          | sí        | Secreto simétrico. ltijs lo usa internamente y nosotros para firmar `lti-claims`. |
| `MONGODB_URL`      | sí        | Conexión Mongo. ltijs persiste claves; nosotros añadimos `lti_nonces`. |
| `CANVAS_ISSUER`    | sí        | URL del issuer Canvas, p.ej. `https://canvas.instructure.com`.   |
| `CANVAS_CLIENT_ID` | no        | Si está, se auto-registra la plataforma al arrancar.             |
| `PUBLIC_BASE_URL`  | no        | Base URL embebida en `/lti-config.json`. Fallback al `Host` header. |
| `SERVER_HTTP_PORT` | no        | Por defecto `3000`.                                              |
| `NODE_ENV`         | no        | `development` activa `devMode` de ltijs y HMR de Vite.           |

---

## Referencias

- README en inglés (autoritativo): [`README.md`](./README.md)
- Instalación end-to-end: [`INSTALL.md`](./INSTALL.md)
- Especificación LTI Cookieless OIDC: <https://www.imsglobal.org/spec/lti-cs-oidc/v0p1>
- Especificación postMessage Storage: <https://www.imsglobal.org/spec/lti-pm-s/v0p1>
- Doc de Canvas postMessage: <https://www.canvas.instructure.com/doc/api/file.lti_window_post_message.html>
