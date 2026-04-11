<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MoodSynth agent guide

## Objetivo del proyecto

MoodSynth genera musica procedural en tiempo real usando:

- mood del usuario
- clima de una ciudad (OpenWeatherMap)

## Reglas de implementacion

- Usar App Router (`src/app`).
- Mantener TypeScript estricto, sin `any` salvo fuerza mayor.
- Priorizar componentes de `shadcn/ui` para UI base.
- Mantener API key en servidor (`OPENWEATHER_API_KEY`), nunca exponerla al cliente.
- Para llamadas de clima, usar `src/app/api/weather/route.ts` como unica capa de acceso.
- Toda logica musical determinista/aleatoria debe vivir en `src/lib/composer.ts`.
- Toda logica Tone.js debe vivir en `src/lib/audio-engine.ts`.

## Convenciones funcionales

- Moods soportados:
  - `Feliz`
  - `Melancolico`
  - `Ansioso`
  - `Tranquilo`
  - `Energetico`
- Weather normalizado:
  - `rain`
  - `clear`
  - `clouds`
  - `thunderstorm`
  - `snow`

## Reglas musicales obligatorias

- lluvia + melancolico -> menor, 60 BPM, piano + pad
- sol + feliz -> mayor, 100 BPM, pluck + synth brillante
- tormenta + ansioso -> frigia, 130 BPM, capas densas con reverb
- nublado + tranquilo -> dorica, 70 BPM, ambient puro
- energetico + cualquier clima -> BPM alto

## Flujo de validacion recomendado

Antes de cerrar cambios:

1. `pnpm lint`
2. `pnpm build`
3. Verificar manualmente en `pnpm dev`:
   - generar audio
   - detener audio
   - cambio de fondo por clima
   - visualizador en canvas

## Documentacion de referencia local

- Next.js docs locales: `node_modules/next/dist/docs/`
- Route handlers: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Environment variables: `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
