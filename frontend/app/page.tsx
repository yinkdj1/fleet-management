import { redirect } from "next/navigation";

export default function Home() {
  redirect("/reserve");
}
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-[var(--color-accent)]/25 blur-3xl orb-float" />
      <div className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-[var(--color-cyan)]/30 blur-3xl orb-float-delayed" />

      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-14">
        <header className="fade-up flex items-center justify-between rounded-full border border-amber-900/15 bg-white/70 px-5 py-3 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-paper-soft)]">Carsgidi</p>
          <Link
            href="/login"
            className="rounded-full border border-amber-900/20 bg-white px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-amber-50"
          >
            Staff Login
          </Link>
        </header>

        <section className="mt-9 grid items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="fade-up rounded-3xl border border-amber-900/15 bg-[linear-gradient(145deg,rgba(255,251,244,0.96),rgba(248,239,224,0.95))] p-7 shadow-[0_30px_70px_-36px_rgba(146,64,14,0.35)] sm:p-10">
            <p className="text-sm tracking-[0.18em] uppercase text-[var(--color-accent)]">Premium Urban Mobility</p>
            <h1 className="mt-5 max-w-2xl text-4xl leading-[1.03] text-zinc-900 sm:text-5xl lg:text-6xl font-[family-name:var(--font-playfair)]">
              Travel like your time is worth something.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-paper-soft)] sm:text-lg">
              Carsgidi blends effortless booking, elegant cars, and reliable service into one smooth experience for airport pickups, city meetings, and weekend escapes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reserve"
                className="attention-bounce rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_26px_-10px_rgba(245,191,98,0.6)]"
              >
                Reserve a Car
              </Link>
              <Link
                href="/api"
                className="rounded-full border border-amber-900/25 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition duration-300 hover:-translate-y-1 hover:bg-amber-50"
              >
                View API Status
              </Link>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <article className="lift-card rounded-2xl border border-amber-900/15 bg-white/70 p-4">
                <p className="text-2xl font-semibold text-zinc-900">4.9</p>
                <p className="text-sm text-[var(--color-paper-soft)]">Average rider rating</p>
              </article>
              <article className="lift-card rounded-2xl border border-amber-900/15 bg-white/70 p-4">
                <p className="text-2xl font-semibold text-zinc-900">18m</p>
                <p className="text-sm text-[var(--color-paper-soft)]">Average booking time</p>
              </article>
              <article className="lift-card rounded-2xl border border-amber-900/15 bg-white/70 p-4">
                <p className="text-2xl font-semibold text-zinc-900">24/7</p>
                <p className="text-sm text-[var(--color-paper-soft)]">Dispatch assistance</p>
              </article>
            </div>
          </div>

          <aside className="fade-up-delayed rounded-3xl border border-[var(--color-accent)]/35 bg-[linear-gradient(180deg,rgba(255,246,233,0.96),rgba(253,239,213,0.92))] p-7 text-[var(--color-ink)] shadow-[0_28px_62px_-34px_rgba(245,191,98,0.75)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-deep)]">Popular Rentals</p>
            <div className="mt-5 grid gap-3">
              <article className="lift-card rounded-2xl border border-[var(--color-accent)]/40 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-deep)]">Executive</p>
                <h2 className="mt-1 text-lg font-semibold">Mercedes C-Class</h2>
                <p className="mt-1 text-sm text-zinc-600">For investor meetings and high-comfort city runs.</p>
              </article>
              <article className="lift-card rounded-2xl border border-[var(--color-accent)]/40 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-deep)]">Family</p>
                <h2 className="mt-1 text-lg font-semibold">Toyota Highlander</h2>
                <p className="mt-1 text-sm text-zinc-600">Space for seven with premium ride quality.</p>
              </article>
              <article className="lift-card rounded-2xl border border-[var(--color-accent)]/40 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent-deep)]">City Smart</p>
                <h2 className="mt-1 text-lg font-semibold">Toyota Corolla</h2>
                <p className="mt-1 text-sm text-zinc-600">Efficient, dependable and perfect for quick movement.</p>
              </article>
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="fade-up rounded-2xl border border-amber-900/15 bg-white/65 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-cyan)]">Customer Story</p>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper)]">
              &ldquo;I booked in less than five minutes and the car arrived polished, fueled, and right on schedule.&rdquo;
            </p>
            <p className="mt-3 text-sm text-[var(--color-paper-soft)]">Ada, Lagos Island</p>
          </article>
          <article className="fade-up-delayed rounded-2xl border border-amber-900/15 bg-white/65 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-cyan)]">Customer Story</p>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper)]">
              &ldquo;Reservation, payment, and itinerary came through instantly. It felt seamless from start to finish.&rdquo;
            </p>
            <p className="mt-3 text-sm text-[var(--color-paper-soft)]">Tunde, Lekki</p>
          </article>
          <article className="fade-up rounded-2xl border border-amber-900/15 bg-white/65 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-cyan)]">Customer Story</p>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-paper)]">
              &ldquo;Elegant interior, smooth handover, and exactly the class of service we needed for the road trip.&rdquo;
            </p>
            <p className="mt-3 text-sm text-[var(--color-paper-soft)]">Mariam, Ikeja</p>
          </article>
        </section>
      </div>
    </main>
  );
}