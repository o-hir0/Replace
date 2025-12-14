import { auth, signOut } from "@/src/auth"
import { redirect } from "next/navigation"
import { db } from "@/src/db"
import { gameResults } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import Link from "next/link"

export default async function MyPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const results = await db.query.gameResults.findMany({
        where: eq(gameResults.userId, session.user.id),
        orderBy: (results, { desc }) => [desc(results.createdAt)],
    })

    return (
        <div className="min-h-screen bg-gray-950 p-8 text-white">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="flex items-center justify-between rounded-2xl bg-gray-900 p-6 shadow-lg ring-1 ring-white/10">
                    <h1 className="text-2xl font-bold">My Page</h1>
                    <div className="flex gap-4">
                        <Link
                            href="/game/?newGame=true"
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 shadow-lg"
                        >
                            冒険に出る
                        </Link>
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
                    </div>
                </header>

                <main className="space-y-6">
                    <div className="rounded-2xl bg-gray-900 p-6 shadow-lg ring-1 ring-white/10">
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
                            Game History
                        </h2>

                        <div className="space-y-4">
                            {results.length === 0 ? (
                                <p className="text-gray-400">No results yet.</p>
                            ) : (
                                results.map((result) => {
                                    // Parse snapshots if they exist (assuming DB returns JSON object automatically or we parse)
                                    // Drizzle 'json' type usually returns the object directly.
                                    const items = result.itemsSnapshot as any[] || [];
                                    let stats = result.statsSnapshot as any || {};
                                    // Handle new structure { player, progress }
                                    if (stats.player) {
                                        stats = stats.player;
                                    }
                                    let nodes: any[] = [];
                                    try {
                                        // result.code is now a JSON column, so it should be an object/array already (or null)
                                        // However, if the driver returns string for some reason or if it was migrated data...
                                        // Since we just changed schema, let's assume it's the object.
                                        if (typeof result.code === 'string') {
                                            nodes = JSON.parse(result.code);
                                        } else {
                                            nodes = result.code as any[];
                                        }
                                    } catch (e) {
                                        // Fallback if code is simple text or parsing fails
                                        // nodes = [{ code: String(result.code) }];
                                    }

                                    return (
                                        <div
                                            key={result.id}
                                            className="rounded-xl bg-gray-950 border border-gray-800 p-4 space-y-4"
                                        >
                                            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                                <span className="text-yellow-400 font-bold">Cycle: {result.cycle}</span>
                                                <span className="text-gray-500 text-sm">{new Date(result.createdAt).toLocaleString()}</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Stats */}
                                                <div className="bg-gray-900 p-3 rounded">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Status</h4>
                                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-300">
                                                        <div>HP: <span className="text-white">{stats.hp}</span>/{stats.maxHp}</div>
                                                        <div>ATK: <span className="text-white">{stats.atk}</span></div>
                                                        <div>BP: <span className="text-white">{stats.bp}</span>/{stats.maxBp}</div>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div className="bg-gray-900 p-3 rounded">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Items</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {items.length > 0 ? items.map((item: any, idx: number) => (
                                                            <div key={idx} className="bg-gray-800 px-2 py-1 rounded text-xs flex items-center gap-1" title={item.code}>
                                                                <span className="text-yellow-200">{item.label}</span>
                                                                <span className="text-gray-500 text-[10px]">{item.type}</span>
                                                            </div>
                                                        )) : <span className="text-gray-600 text-sm">None</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Code */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Code</h4>
                                                <div className="bg-gray-900 p-3 rounded font-mono text-xs text-green-400 overflow-x-auto">
                                                    {nodes.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {nodes.map((node: any, idx: number) => (
                                                                <div key={idx} className="flex gap-2">
                                                                    <span className="text-gray-600 select-none w-6 text-right">{idx + 1}</span>
                                                                    <span>{node.label}</span>
                                                                    {/* <span className="text-gray-600 ml-2">// {node.code}</span> */}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="whitespace-pre-wrap break-all">
                                                            {typeof result.code === 'string'
                                                                ? result.code
                                                                : JSON.stringify(result.code, null, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </main>
            </div >
        </div >
    )
}
