# Nostropy

The open source nostr based online casino.

Este proyecto está en fase de desarrollo. Hasta ahora se ha implementado el juego **Mines**.

Características clave:
- Autenticación mediante Nostr (firma de apuestas y eventos). (WIP)
- 100% auditable y open source.
- Aleatoriedad justa (*Provably Fair*) usando client seed y server seed.

## Arquitectura

El proyecto funciona como un monorepositorio con:
- **Backend**: Node.js + Express en el directorio raíz.
- **Frontend**: React + Vite + Tailwind CSS v4 en el directorio `/frontend`.

## Comenzando (Getting Started)

### 1. Backend (Express)
Desde el directorio raíz del proyecto, instala las dependencias y ejecuta el servidor de desarrollo:

```bash
# Instalar dependencias del backend
npm install

# Iniciar el servidor de desarrollo del backend (puerto 5000 por defecto)
npm run dev:backend
```

### 2. Frontend (React/Vite)
En una nueva terminal, navega al directorio del frontend, instala las dependencias y ejecuta la app:

```bash
# Navegar al directorio del frontend
cd frontend

# Instalar dependencias del frontend
npm install

# Iniciar el servidor de desarrollo del frontend (puerto 5173 por defecto)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver y jugar a la aplicación.

## Contribuir

Este proyecto es 100% open source. Si deseas colaborar o aportar mejoras:

1. Haz fork del repositorio.
2. Crea una rama con tu feature o corrección.
3. Envía un pull request describiendo tus cambios.

> Consulta los archivos `CLAUDE.md` y `AGENTS.md` para entender mejor el contexto y la finalidad de los asistentes automáticos o las instrucciones internas de IA.
