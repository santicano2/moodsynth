import { MoodSynthPlayer } from "@/components/moodsynth-player";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.25),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(14,165,233,.2),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,.18),transparent_45%)]" />
      <div className="relative z-10 w-full max-w-5xl">
        <MoodSynthPlayer />
      </div>
    </main>
  );
}
