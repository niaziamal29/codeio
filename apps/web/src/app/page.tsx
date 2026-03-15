export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-4">
        Code<span className="text-brand-primary">io</span>
      </h1>
      <p className="text-xl text-slate-400 mb-8">
        Vibe coding in your browser
      </p>
      <a
        href="/dashboard"
        className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Get Started
      </a>
    </main>
  );
}
