# CLAUDE Context

Este documento ayuda a contextualizar al modelo de IA (Claude, Copilot, etc.) sobre el propósito y alcance del proyecto Nostropy.

- **Objetivo**: Construir un casino basado en Nostr, 100% auditable, donde la aleatoriedad es verificable y el host no tiene control criptográfico sobre los resultados.
- **Stack**: Next.js (frontend y backend unificados) con TypeScript.
- **Autenticación**: Uso de claves y eventos Nostr para firmar apuestas y resultados.
- **Verificabilidad**: Cada juego debe poder comprobarse con un `client seed` del jugador y un `host seed` del servidor.

Los desarrolladores deben mantener el código abierto y asegurarse de que cualquier parte crítica del juego pueda inspeccionarse y verificarse. Cuando se planteen preguntas relativas a implementación, seguridad o arquitectura, recuerde priorizar la transparencia y auditabilidad.