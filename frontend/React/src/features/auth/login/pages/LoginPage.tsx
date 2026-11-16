import { LoginForm } from '../components/LoginForm'
import { Wordmark } from '../components/LabelIcon'
import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <main className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 sm:p-5 lg:p-7">
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-stone-900/10 dark:bg-stone-900 dark:shadow-black/30 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
        {/* Back button: pinned to the card's top-left corner. On desktop it
            sits on the peach panel, so it uses a frosted-white pill that
            matches that panel; on small screens it sits on the white card. */}
        <Link
          to="/"
          className="group absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-100 py-2 pl-3 pr-4 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 lg:border-amber-950/15 lg:bg-white/60 lg:text-amber-950 lg:backdrop-blur-sm lg:hover:border-amber-950/25 lg:hover:bg-white/85 dark:lg:border-amber-950/15 dark:lg:bg-white/60 dark:lg:text-amber-950 dark:lg:hover:bg-white/85 sm:left-6 sm:top-6"
        >
          <svg
            aria-hidden="true"
            className="size-4 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back to home</span>
        </Link>

        <section className="relative hidden overflow-hidden bg-[#f4d0a5] p-12 text-amber-950 lg:flex lg:flex-col lg:justify-center lg:gap-1">
          <div aria-hidden="true" className="absolute -bottom-13 size-25 rounded-full bg-amber-950/80" />
          <div aria-hidden="true" className="absolute -left-12 -top-12 size-40 rounded-full bg-amber-950/50" />
          <div aria-hidden="true" className="absolute -bottom-16 -right-2 size-58 rounded-full border-[1.5rem] border-amber-950/20" />
          <div aria-hidden="true" className="absolute -top-1 -right-2 size-40 rounded-full bg-amber-950/90" />

          <div className="relative flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <img
              src="/Component 1.png"
              alt="XPawSure"
              className="-mt-2 h-8 w-auto drop-shadow-2xl sm:h-5 lg:h-15"
            />
          </div>

          <div className="relative max-w-sm">
            <div className="mb-2 grid size-30 place-items-center rounded-full border-8 border-amber-950/15 bg-white/55 text-6xl">
              <img
                src="/xpawsure-logo.png"
                alt="XPawSure"
                className="size-30 object-contain"
              />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-900/75">
              Clinic workspace
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">
              Care for every patient with confidence.
            </h1>
            <p className="mt-5 max-w-xs text-base leading-7 text-amber-950/75">
              Securely manage your clinic operations and veterinary records in one place.
            </p>
          </div>

          <p className="relative text-sm font-medium text-amber-950/70">
            AI-assisted screening supports, but never replaces, veterinary judgment.
          </p>
        </section>

        {/* Extra top padding on small screens so the back button never
            collides with the logo block. */}
        <section className="flex items-center justify-center px-6 pb-12 pt-24 sm:px-12 lg:px-20 lg:py-12">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="mb-6 flex items-center gap-3 text-xl font-extrabold tracking-tight text-amber-950 dark:text-amber-300">
                <span className="grid size-11 place-items-center rounded-2xl bg-amber-950 text-2xl text-[#f4d0a5]" aria-hidden="true">
                  🐾
                </span>
                XPawSure
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                Clinic workspace
              </p>
            </div>

            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100 sm:text-4xl">
                Sign in to <span><Wordmark /></span>
              </h2>
              <p className="mt-3 text-base leading-7 text-stone-600 dark:text-stone-400">
                Enter your credentials to access your clinic workspace.
              </p>
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  )
}
