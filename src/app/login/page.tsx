import { signIn } from "@/src/auth"

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-gray-900 p-10 shadow-2xl ring-1 ring-white/10">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Sign in to access your account
                    </p>
                </div>
                <form
                    action={async () => {
                        "use server"
                        await signIn("github", { redirectTo: "/mypage" })
                    }}
                    className="mt-8 space-y-6"
                >
                    <button
                        type="submit"
                        className="group relative flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg
                                className="h-5 w-5 text-gray-500 group-hover:text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </span>
                        Sign in with GitHub
                    </button>
                </form>
            </div>
        </div>
    )
}
