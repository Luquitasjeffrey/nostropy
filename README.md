# Nostropy

The open source nostr based online casino

Este proyecto está en fase de desarrollo todavía.

Hasta ahora sólo se ha implementado el juego **mines** bajo la ruta `/games/mines`.

Características clave:

- Autenticación mediante Nostr (firma de apuestas y eventos).
- 100% auditable y open source.
- Aleatoriedad justa (*fair randomness*) usando client seed y server seed.

El stack utiliza Next.js con TypeScript, combinando backend y frontend en el mismo repositorio.

## Estructura del proyecto

- `/api` contiene las rutas API de los juegos.
- `/app/games/mines` alberga la interfaz del juego "mines".
- `models/` incluye los esquemas de Mongoose.

## Comenzando

Instala las dependencias y ejecuta el servidor de desarrollo:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

## Contribuir

Este proyecto es 100% open source. Si deseas colaborar o aportar mejoras:

1. Haz fork del repositorio.
2. Crea una rama con tu feature o corrección.
3. Envía un pull request describiendo tus cambios.

Asegúrate de que los cambios sigan el modelo de seguridad y verificabilidad de Nostr establecido en la documentación del proyecto.

> Consulta los archivos `CLAUDE.md` y `AGENTS.md` para entender mejor el contexto y la finalidad de los asistentes automáticos o las instrucciones internas de IA.

---

Este README se actualizará a medida que se definan las especificaciones de los juegos y la arquitectura del sistema.
