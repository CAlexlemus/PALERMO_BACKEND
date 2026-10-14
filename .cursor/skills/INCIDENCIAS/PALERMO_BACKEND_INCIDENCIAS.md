

## 0. Rol y modo de trabajo

Actúa como desarrollador senior de **NestJS, TypeORM, PostgreSQL y almacenamiento S3 compatible con Railway**. **Implementa el módulo completo en el repositorio abierto, no te limites a explicar cómo hacerlo.** Antes de programar, inspecciona estructura, dependencias, `AppModule`, entidades, conexión TypeORM, autenticación/JWT, guards, convenciones de nombres, DTO, controladores existentes, respuestas HTTP, scripts de pruebas y manejo de errores.

- Respeta la arquitectura, estilo, patrones y convenciones **reales** del código. No reescribas módulos existentes ni alteres flujos de asistencia, rutas, usuarios, obras o login.
- Reutiliza auth y validaciones existentes; no introduzcas otro login ni supongas que el JWT tiene campos que no tiene. Verifica cómo se obtiene el `id` del usuario autenticado.
- Revisa `git status` antes y después. No sobrescribas trabajo previo, no borres cambios ajenos y no uses `git reset --hard`, `git clean -fd`, `npm audit fix --force` ni `typeorm synchronize=true`.
- Si detectas una ambigüedad, resuélvela revisando el código y documenta brevemente la decisión. Pregunta únicamente si existe un bloqueo real imposible de resolver inspeccionando el repositorio.

## 1. Contexto del proyecto y estado YA REALIZADO

Proyecto de seguridad/rondines de **Villas Palermo**. Se requiere que un guardia o administrador registre incidencias con **título, descripción, fecha automática, obra, usuario y cero o varias fotografías**; el personal autorizado podrá consultar reportes y fotos privadas. El sistema ya tiene servicios desplegados en Railway:

- Backend: `PALERMO_BACKEND` (NestJS).
- Base de datos: PostgreSQL/PostGIS gestionado en Railway; ORM: **TypeORM**.
- Bucket S3 compatible: servicio de Railway llamado `ergonomic-chamber`, privado, ya creado y conectado al backend mediante **variables de referencia**.
- Se instaló localmente `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner` con npm. Confirma en `package.json`; instálalos solo si faltan.
- Railway tiene un despliegue exitoso del backend con las nuevas variables. **Este hecho no significa que el módulo de incidencias esté implementado.**
- IDs de `usuarios.id` y `obras.id`: `uuid`.
- Roles conocidos de la BD: `1 = Administrador`, `2 = Guardia`. Verifica los modelos reales y cómo se usa `rolid` en autorización.
- Algunas cuadrillas aún podrían apuntar a otras obras; **no reasignes registros ni modifiques los datos existentes automáticamente**.

### Tablas ya creadas en la base de datos de PRODUCCIÓN

**No ejecutes ni generes operaciones destructivas sobre estas tablas.** Las siguientes tablas e índices existen, fueron creados manualmente en Railway y el `COMMIT` ya fue ejecutado:

```sql
CREATE TABLE incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE RESTRICT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'reportada'
        CHECK (estado IN ('reportada', 'en_revision', 'resuelta')),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incidencia_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incidencia_id UUID NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    archivo_clave TEXT NOT NULL UNIQUE,
    nombre_archivo VARCHAR(255),
    tipo_mime VARCHAR(100),
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidencias_usuario ON incidencias(usuario_id);
CREATE INDEX idx_incidencias_obra_fecha ON incidencias(obra_id, fecha_registro DESC);
CREATE INDEX idx_incidencia_fotos_incidencia ON incidencia_fotos(incidencia_id);
```

**Importante:** La BD ya contiene estas tablas, pero puede no contener registros de prueba. Mapea las entidades TypeORM exactamente a estos nombres y tipos. **No vuelvas a crearlas mediante `synchronize`**; en producción debe seguir `DB_SYNCHRONIZE=false`. Si el proyecto administra migraciones, prepara una migración de reconocimiento/creación condicional **sin aplicarla en producción ni duplicar el esquema**; indica el procedimiento seguro de adopción. Para este trabajo no hace falta cambiar el esquema anterior.

## 2. Variables de almacenamiento disponibles

En `PALERMO_BACKEND` (Railway) están inyectadas estas variables con referencias automáticas al Bucket:

```dotenv
AWS_ENDPOINT_URL=<referencia-de-Railway>
AWS_S3_BUCKET_NAME=<referencia-de-Railway>
AWS_DEFAULT_REGION=<referencia-de-Railway>  # el valor real puede ser "auto"
AWS_ACCESS_KEY_ID=<referencia-de-Railway>
AWS_SECRET_ACCESS_KEY=<referencia-de-Railway>
```

- Usar **estos nombres exactos**, no inventar `BUCKET_NAME` u otros sustitutos sin compatibilidad.
- Crear/actualizar `.env.example` con nombres y valores ficticios, jamás copiar credenciales reales al repo, código fuente, frontend o logs.
- Configurar `S3Client` (SDK v3) con `endpoint`, `region`, `credentials` y estilo de URL apropiado. Railway usa normalmente **virtual-hosted style**: no forzar `forcePathStyle:true` indiscriminadamente. Si el entorno tiene `AWS_S3_URL_STYLE`, respetarlo (`path` vs `virtual`); si no, usar virtual por defecto.
- Validar/configurar adecuadamente los parámetros; errores de conexión deben generar respuesta controlada y logs sin secretos.
- El bucket es **privado**: almacenar `archivo_clave`, no URL pública ni binarios/base64 en PostgreSQL. Para visualizar, generar una URL firmada `GET` de corta duración (por ejemplo 300 segundos) **solo luego de autorizar al usuario**.

Documentación oficial para contrastar integraciones: https://docs.railway.com/storage-buckets y https://docs.railway.com/guides/storage-buckets-guide.

## 3. Arquitectura y archivos esperados

Crear/adaptar en `src/incidencias/` (rutas y nombres respetando convenciones del repo):

- `incidencias.module.ts`: registra controlador, servicios, entidades TypeORM e inyección necesaria.
- `incidencias.controller.ts`: endpoints protegidos con la autenticación ya existente.
- `incidencias.service.ts`: reglas de negocio, persistencia, paginación, consulta y cambio de estado.
- `entities/incidencia.entity.ts` y `entities/incidencia-foto.entity.ts`: mapeo fiel a BD.
- `dto/crear-incidencia.dto.ts`, `dto/consultar-incidencias.dto.ts`, `dto/cambiar-estado-incidencia.dto.ts` (y DTO adicionales si hacen falta).
- `storage/incidencias-storage.service.ts` o servicio reutilizable de storage, con `S3Client`, carga, eliminación compensatoria y firma de enlaces.
- Pruebas unitarias/integración siguiendo la estructura actual.

Reutilizar entidades de usuarios y obras ya definidas sin duplicarlas. Configurar relaciones si encajan sin modificar destructivamente las tablas de origen. Registrar el nuevo módulo en `AppModule` según el patrón existente. Revisar si `nest g module incidencias` ya se ejecutó para no crear duplicados.

## 4. Reglas del dominio

**Incidencia**

- `id`: UUID automático.
- `titulo`: requerido, sin espacios vacíos, de 3 a 200 caracteres.
- `descripcion`: requerida, sin espacios vacíos, de 5 a 5000 caracteres a nivel DTO (el campo BD es `TEXT`).
- `obra_id`: UUID válido y obra existente; la obra debe estar **autorizada** para ese usuario. Verifica cómo determina el sistema la empresa/obra activa y los permisos. Si el modelo actual no permite validarlo con seguridad, reutiliza el mecanismo existente en vez de asumir que cualquier `obra_id` es válido. Un guardia nunca debe poder crear/ver incidencias arbitrarias de otra obra.
- `usuario_id`: siempre viene de la identidad **autenticada**, jamás confiar en `usuario_id` enviado por el cliente.
- `estado`: al crear, siempre `reportada`; transiciones válidas desde administrador: `reportada -> en_revision -> resuelta`. Si el sistema requiere reapertura, **no inventarla** sin justificación de negocio.
- `fecha_registro`: generación exclusiva por PostgreSQL `NOW()` en columna `TIMESTAMPTZ`; devolver ISO 8601 con zona/UTC en JSON; no permitir que el usuario imponga la fecha.
- Fotos: opcionales al registrar la incidencia, máximo **5 imágenes** por incidencia en total; formatos **JPEG, PNG y WebP**; máximo **5 MiB por archivo**. Validar MIME, extensión razonable y **firma real del archivo** (magic bytes), no solo el `Content-Type` declarado. Prohibir SVG y otros tipos ejecutables. No utilizar nunca el nombre original como ruta final del objeto.
- `archivo_clave`: generar clave única en el servidor, por ejemplo `incidencias/{uuid-incidencia}/{uuid-archivo}.jpg`; extensión de acuerdo con contenido validado. Registrar nombre original saneado y MIME real en DB.
- Sin fotos también debe ser válido.

**Permisos**

- Usuario autenticado con rol Guardia: puede crear una incidencia para una obra a la que tenga acceso y consultar sus propias incidencias (y solamente sus fotos). Puede añadir fotos **solo a su incidencia en estado `reportada`**, dentro del límite, si se implementa endpoint de anexos.
- Rol Administrador: puede consultar incidencias dentro de su ámbito/empresa/obra y cambiar su estado; no debe acceder a datos de empresas ajenas si el sistema es multiempresa.
- Los permisos reales y el ámbito deben verificarse contra el repositorio, no asumir que `rolid` basta para autorizar todas las obras.
- No introducir endpoints públicos para imágenes ni para reportes.

## 5. Contrato de API obligatorio (compartido con el frontend)

Respeta prefijos globales existentes, por ejemplo si el proyecto ya usa `/api`, el controlador debe integrarse sin duplicarlo. Documentar rutas efectivas.

### A. Crear incidencia (con fotos opcionales)

`POST /incidencias` — `multipart/form-data` autenticado

Campos:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `titulo` | string | Sí | 3–200 caracteres |
| `descripcion` | string | Sí | 5–5000 caracteres |
| `obra_id` | UUID string | Sí | Obra autorizada |
| `fotos` | archivos repetidos con el mismo nombre de campo | No | 0–5 fotos, cada una ≤ 5 MiB |

No aceptar `usuario_id`, `estado` o `fecha_registro` definidos por el cliente.

Respuesta `201 Created`:

```json
{
  "id": "<uuid>",
  "titulo": "Portón principal dañado",
  "descripcion": "La cerradura no funciona durante el rondín.",
  "estado": "reportada",
  "obra_id": "<uuid>",
  "usuario_id": "<uuid-usuario-autenticado>",
  "fecha_registro": "2026-10-14T04:00:00.000Z",
  "fotos": [
    {
      "id": "<uuid-foto>",
      "nombre_archivo": "porton.jpg",
      "tipo_mime": "image/jpeg"
    }
  ]
}
```

**La fecha y los UUID son solo ejemplos de forma, no datos fijos.** El backend puede usar el envelope común de respuestas existente, pero debe mantener los nombres de campos del recurso o documentar explícitamente un contrato equivalente para el frontend.

### B. Listar incidencias

`GET /incidencias?pagina=1&limite=10&obra_id=<uuid>&estado=reportada`

- `pagina` por defecto 1; `limite` por defecto 10, máximo 100.
- `obra_id` y `estado` son filtros opcionales, validados, sin saltarse el ámbito autorizado.
- Orden por `fecha_registro DESC` y desempate por `id DESC`.
- Cada elemento debe incluir `id`, `titulo`, `descripcion` (o extracto documentado), `estado`, `fecha_registro`, `obra_id`, `usuario_id`, `nombreusuario` si está disponible, `cantidad_fotos`.
- Contrato sugerido:

```json
{
  "data": [
    {
      "id": "<uuid>",
      "titulo": "Portón principal dañado",
      "descripcion": "La cerradura no funciona durante el rondín.",
      "estado": "reportada",
      "fecha_registro": "2026-10-14T04:00:00.000Z",
      "obra_id": "<uuid>",
      "usuario_id": "<uuid>",
      "nombreusuario": "carlos",
      "cantidad_fotos": 1
    }
  ],
  "meta": { "pagina": 1, "limite": 10, "total": 1, "total_paginas": 1 }
}
```

### C. Detalle de incidencia

`GET /incidencias/:id` autenticado

Respuesta con todos los campos de incidencia y arreglo `fotos`:

```json
{
  "id": "<uuid>",
  "titulo": "Portón principal dañado",
  "descripcion": "La cerradura no funciona durante el rondín.",
  "estado": "reportada",
  "fecha_registro": "2026-10-14T04:00:00.000Z",
  "obra_id": "<uuid>",
  "usuario_id": "<uuid>",
  "nombreusuario": "carlos",
  "fotos": [
    {
      "id": "<uuid-foto>",
      "nombre_archivo": "porton.jpg",
      "tipo_mime": "image/jpeg",
      "fecha_registro": "2026-10-14T04:00:01.000Z",
      "url": "<url-firmada-de-lectura-que-caduca>"
    }
  ]
}
```

No retornar `archivo_clave` si no es indispensable; jamás retornar credenciales. Las URLs pueden caducar; al reabrir el detalle deben regenerarse. En endpoint de solo listado, evitar firmar URLs de todas las fotos por costo/rendimiento.

### D. Cambiar estado (administrador)

`PATCH /incidencias/:id/estado` — JSON autenticado:

```json
{ "estado": "en_revision" }
```

Validar estado permitido y transición. Retornar incidencia actualizada o respuesta estándar del repo, documentada.

### E. Agregar fotos después de crear (implementación requerida)

`POST /incidencias/:id/fotos` — `multipart/form-data` autenticado, campo repetible `fotos`.

- Debe reutilizar validación, autorización y almacenamiento.
- Puede recibir de 1 a 5 archivos, pero **nunca superar cinco en total** por incidencia, contando fotos existentes.
- Guardia: solo propia en estado `reportada`. Administrador: solo dentro de su ámbito autorizado.
- Retornar metadatos de las nuevas fotos; el frontend actualizará el detalle.

### Códigos HTTP

- `400` formato/campo/archivo inválido o intento de transición inválida.
- `401` no autenticado.
- `403` usuario no autorizado para obra, incidencia u operación.
- `404` incidencia/obra inexistente o fuera del alcance cuando convenga evitar divulgación.
- `413` archivo demasiado grande.
- `409` conflicto de estado o límite total de fotos, según la convención actual.
- `500/503` falla no prevista o de storage, sin exponer credenciales ni trazas internas.

## 6. Implementación técnica de fotografías

**Para este MVP usa subida mediada por el backend**: el navegador/app envía `multipart/form-data` a NestJS, NestJS valida y sube al Bucket mediante `PutObjectCommand`. Esta ruta no requiere CORS del Bucket y es sencilla para un máximo de cinco imágenes moderadas. No hagas que el navegador intente enviar fotos a un Bucket privado usando credenciales AWS. Como mejora futura, documenta la alternativa de **presigned PUT**, sin implementarla salvo que la arquitectura real la exija.

- Usar interceptor/adaptador de archivos según el adaptador HTTP real (Express: `FilesInterceptor`/Multer en memoria si corresponde; Fastify: su integración compatible). Inspeccionar el proyecto primero.
- Limitar archivos y tamaño desde el parser HTTP y reiterar las validaciones en el servicio; evitar guardar en disco efímero del contenedor.
- Aplicar carga al Bucket mediante `PutObjectCommand` con `Bucket`, `Key`, `Body` y `ContentType` correctos.
- Para leer usar `GetObjectCommand` + `getSignedUrl()` con expiración corta (300 s). Firmar solo después de comprobar autenticación y autorización.
- Para limpieza usar `DeleteObjectCommand`. **Nunca sobrescribir claves** ni interpolar rutas del usuario en la clave S3.
- Evitar inconsistencias entre Postgres y storage: generar `incidenciaId` primero en servidor, validar permisos, subir archivos, y persistir la incidencia + referencias de fotos en **transacción TypeORM**. Si falla la carga, borrar los objetos que sí se alcanzaron a subir. Si falla la transacción, intentar limpiar los objetos subidos (best effort, registrar error sanitizado). No dejar filas de fotos sin objeto cuando se puede evitar. No mantener una transacción DB abierta durante llamadas largas a S3.
- Al adjuntar fotos a una incidencia existente, aplicar el mismo patrón de compensación.
- Considerar concurrencia del límite de 5 imágenes: serializar por incidencia con lock apropiado durante comprobación/persistencia o documentar estrategia segura para dos cargas concurrentes; no depender de una validación no atómica.
- Logs estructurados con ID de incidencia y resultados generales, **sin secretos, cuerpos de fotos o URLs firmadas**.

## 7. Verificación / pruebas obligatorias

Implementar pruebas de servicios y controladores coherentes con Jest u otro runner ya instalado:

1. Crear incidencia válida sin fotografías (estado `reportada`, fecha asignada por BD).
2. Crear incidencia con 1 y 5 fotos válidas: referencias correctas y archivos enviados al storage mock.
3. Rechazar 6 fotos, una mayor a 5 MiB, MIME no permitido, extensión falsa y firmas falsas.
4. Rechazar título vacío, descripción vacía, UUID inválido, obra inexistente.
5. Verificar que `usuario_id` provenga del JWT y que campos manipulados por cliente se ignoren/rechacen.
6. Guardia no puede consultar incidencias de otros, ni subir fotos a otras obras; administrador restringido a su ámbito.
7. Lista paginada y filtrada correctamente; validar límites/estados.
8. Estado solo modificable por administrador y con transiciones válidas.
9. Falla S3 o BD: manejo de error adecuado y compensación de objetos.
10. GET detalle regenera URL firmada y no revela secretos.
11. Endpoint adjuntar fotos: límite total incluso en casos concurrentes.

Ejecutar al terminar, según scripts reales: `npm run build`, `npm run lint` si está configurado y las pruebas relevantes. No dar por aprobadas pruebas no ejecutadas. No depender de credenciales de producción para correr tests: usar mocks.

## 8. Entregables 

Al finalizar, muestra:

- Archivos creados/modificados y explicación breve de decisiones importantes.
- Contrato final **exacto** de la API (métodos, rutas reales, nombres de campos, estructura JSON, auth).
- Ejemplos funcionales `curl` para POST multipart con `-F 'titulo=...'`, `-F 'descripcion=...'`, `-F 'obra_id=...'`, `-F 'fotos=@...'` (sin token real) y GET de detalle.
- Verificaciones ejecutadas con resultados reales y fallos restantes.
- Variables requeridas y `.env.example` sanitizado; ninguna credencial real en archivos o respuesta.
- Instrucciones seguras para desplegar el cambio a Railway por GitHub, sin forzar sincronización de esquemas y sin tocar las tablas manualmente existentes.
- Notas para el frontend respecto al contrato final; **si el contrato difiere del especificado por una convención necesaria del proyecto, explica cada diferencia** y deja el frontend compatible.

**Criterio de finalización:** desde una sesión autenticada se puede registrar una incidencia con 0 a 5 fotos, esas fotos quedan en `ergonomic-chamber` y sus claves en `incidencia_fotos`; se puede listar, ver detalle/fotos privadas y cambiar estado según permisos, sin interrumpir otros módulos.
