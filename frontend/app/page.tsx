import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#fff7ed_0%,#ffedd5_35%,#fed7aa_65%,#fdba74_100%)] px-6 py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white/90 backdrop-blur rounded-3xl border border-amber-200 p-8 shadow-[0_20px_80px_-30px_rgba(146,64,14,0.65)]">
            <p className="text-xs tracking-[0.26em] uppercase font-semibold text-amber-800">Carsgidi</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.05] text-zinc-900">
              Rent Cars The Way People Actually Travel
            </h1>
            <p className="mt-4 text-zinc-700 text-lg leading-relaxed">
              From airport pickups to weekend road trips, Carsgidi helps real people book trusted cars online with fast payment and instant confirmation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reserve"
                className="rounded-xl bg-zinc-900 text-white px-5 py-3 font-semibold"
              >
                Reserve A Car
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-900 text-zinc-900 px-5 py-3 font-semibold"
              >
                Staff Login
              </Link>
            </div>
          </div>

          <div className="rounded-3xl p-8 bg-zinc-950 border border-zinc-800 text-zinc-100 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)]">
            <h2 className="text-2xl font-bold">Popular Rentals</h2>
            <p className="mt-2 text-sm text-zinc-300">The kinds of rides customers book every day.</p>

            <div className="mt-6 grid gap-4">
              <article className="rounded-2xl bg-zinc-900/90 border border-zinc-700 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Family</p>
                <p className="mt-1 text-lg font-semibold">Toyota Highlander</p>
                <p className="text-sm text-zinc-400">Comfortable for 7 seats and long weekend drives.</p>
              </article>
              <article className="rounded-2xl bg-zinc-900/90 border border-zinc-700 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Business</p>
                <p className="mt-1 text-lg font-semibold">Mercedes C-Class</p>
                <p className="text-sm text-zinc-400">Clean executive interior for meetings and events.</p>
              </article>
              <article className="rounded-2xl bg-zinc-900/90 border border-zinc-700 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300">City</p>
                <p className="mt-1 text-lg font-semibold">Toyota Corolla</p>
                <p className="text-sm text-zinc-400">Easy fuel economy for everyday movement.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <article className="rounded-2xl bg-white/90 border border-amber-200 p-5">
            <p className="text-sm text-zinc-500">Customer Story</p>
            <p className="mt-2 font-semibold text-zinc-900">"I booked in under 5 minutes and picked up right on time."</p>
            <p className="mt-2 text-sm text-zinc-600">Ada, Lagos Island</p>
          </article>
          <article className="rounded-2xl bg-white/90 border border-amber-200 p-5">
            <p className="text-sm text-zinc-500">Customer Story</p>
            <p className="mt-2 font-semibold text-zinc-900">"Payment confirmation and reservation details came through instantly."</p>
            <p className="mt-2 text-sm text-zinc-600">Tunde, Lekki</p>
          </article>
          <article className="rounded-2xl bg-white/90 border border-amber-200 p-5">
            <p className="text-sm text-zinc-500">Customer Story</p>
            <p className="mt-2 font-semibold text-zinc-900">"The car was exactly what I expected for my road trip."</p>
            <p className="mt-2 text-sm text-zinc-600">Mariam, Ikeja</p>
          </article>
        </section>
      </div>
    </main>
  );
}