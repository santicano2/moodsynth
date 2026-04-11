# MoodSynth

MoodSynth es una app web hecha con Next.js que genera musica procedural en tiempo real a partir de dos entradas:

- estado de animo del usuario
- clima actual de una ciudad

Usa Tone.js para sintetizar audio en el navegador y OpenWeatherMap para obtener el clima.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Tone.js
- OpenWeatherMap API

## Flujo de la app

1. El usuario ingresa una ciudad y selecciona un mood.
2. `GET /api/weather?city=...` consulta OpenWeatherMap:
   - geocoding para lat/lon
   - clima actual para temperatura, condicion, humedad y hora local
3. `composeMusic(mood, weather)` construye una configuracion musical:
   - escala
   - BPM
   - instrumentos
   - capas (melodia, bajo, pad)
4. Tone.js reproduce la composicion en loop con secuencias generadas aleatoriamente.
5. Se actualiza el texto descriptivo y el visualizador de onda.

## Estructura relevante

- `src/app/api/weather/route.ts`: API de clima
- `src/lib/composer.ts`: logica de composicion musical
- `src/lib/audio-engine.ts`: motor de audio (Tone.js)
- `src/components/moodsynth-player.tsx`: UI principal, controles y visualizador
