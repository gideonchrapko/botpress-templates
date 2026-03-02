import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ALLOWED_EMAIL = "gideon.chrapko@botpress.com";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ALLOWED_EMAIL) {
    redirect("/?error=Forbidden");
  }
  return <>{children}</>;
}
