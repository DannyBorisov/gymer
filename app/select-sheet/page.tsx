import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SheetList } from "./sheet-list"

export default async function SelectSheetPage() {
  const session = await auth()

  if (!session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Gymer
            </h1>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 hidden sm:block">
                {session.user?.email}
              </span>
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/" })
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 py-1"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Your Programs
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-400 mt-2">
            Choose an existing program or create a new one
          </p>
        </div>

        <Link
          href="/create-program"
          className="block w-full px-6 py-4 mb-8 bg-blue-600 text-white rounded-2xl font-semibold text-base text-center active:bg-blue-700"
        >
          + Create Program
        </Link>

        <SheetList />
      </main>
    </div>
  )
}
