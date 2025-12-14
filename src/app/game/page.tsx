import Game from '../../components/Game';
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main>
      <Game />
    </main>
  );
}
