import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  return (
    <main className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-stone-900/10 dark:bg-stone-900 dark:shadow-black/30 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#f4d0a5] p-12 text-amber-950 lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="absolute -left-12 -top-12 size-40 rounded-full bg-amber-950/90" />
          <div aria-hidden="true" className="absolute -bottom-16 -right-14 size-56 rounded-full border-[1.5rem] border-amber-950/20" />
          <div aria-hidden="true" className="absolute right-12 top-16 text-6xl text-amber-950/90">
            🐾
          </div>

          <div className="relative flex items-center gap-3 text-xl font-extrabold tracking-tight">
            <span className="grid size-11 place-items-center rounded-2xl bg-amber-950 text-2xl text-[#f4d0a5]" aria-hidden="true">
              🐾
            </span>
            XPawSure
          </div>

          <div className="relative max-w-sm">
            <div className="mb-8 grid size-28 place-items-center rounded-full border-8 border-amber-950/15 bg-white/55 text-6xl">
              🐶
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

        <section className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
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

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-400">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100 sm:text-4xl">
                Sign in to XPawSure
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
