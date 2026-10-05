import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2 dark:bg-stone-950">
      <section className="relative flex min-h-[300px] items-center justify-center overflow-hidden p-8 sm:min-h-[360px] lg:min-h-screen lg:p-12">
        <img
          src="/Background.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
        />

        <div className="relative flex flex-col items-center text-center gap-0">
          <img
            src="/Logo.png"
            alt="XPawSure"
            className="h-36 w-auto drop-shadow-2xl sm:h-44 lg:h-70"
          />
          <img
            src="/Title.png"
            alt="XPawSure"
            className="-mt-7 h-8 w-auto drop-shadow-2xl sm:h-10 lg:h-25"
          />
          
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 lg:py-16 bg-[#1e120f]">
        <div className="w-full max-w-md">
         

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-stone-950 sm:text-4xl text-white">
            Welcome back
          </h1>

          <p className="mt-4 text-base leading-7 text-stone-500 dark:text-stone-500">
            Sign in to manage appointments, patients, and medical records for
            your clinic workspace.
          </p>

          <div className="mt-10">
            <LoginForm />
          </div>

          <p className="mt-10 text-sm leading-6 text-stone-500 dark:text-stone-500">
            AI-assisted screening supports, but never replaces, veterinary
            judgment.
          </p>
        </div>
      </section>
    </main>
  )
}
