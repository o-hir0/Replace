import { auth, signOut } from "@/src/auth"
import { redirect } from "next/navigation"

export default async function MyPage() {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-gray-950 p-8 text-white">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="flex items-center justify-between rounded-2xl bg-gray-900 p-6 shadow-lg ring-1 ring-white/10">
                    <h1 className="text-2xl font-bold">My Page</h1>
                    <form
                        action={async () => {
                            "use server"
                            await signOut({ redirectTo: "/login" })
                        }}
                    >
                        <button
                            type="submit"
                            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                        >
                            Sign Out
                        </button>
                    </form>
                </header>

                <main className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl bg-gray-900 p-6 shadow-lg ring-1 ring-white/10">
                        <h2 className="mb-4 text-lg font-semibold text-gray-200">Profile</h2>
                        <div className="flex items-center space-x-4">
                            {session.user?.image && (
                                <img
                                    src={session.user.image}
                                    alt="Avatar"
                                    className="h-16 w-16 rounded-full ring-2 ring-gray-700"
                                />
                            )}
                            <div>
                                <p className="text-xl font-medium text-white">
                                    {session.user?.name}
                                </p>
                                <p className="text-sm text-gray-400">{session.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-gray-900 p-6 shadow-lg ring-1 ring-white/10">
                        <h2 className="mb-4 text-lg font-semibold text-gray-200">
                            Session Details
                        </h2>
                        <pre className="overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-300">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </div>
                </main>
            </div>
        </div>
    )
}
