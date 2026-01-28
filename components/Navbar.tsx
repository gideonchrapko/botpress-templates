"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Home, LogOut } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/assets/botpress-logo-dark.svg"
            alt="Botpress Logo"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <div className="flex items-center gap-4">
          {session && (
            <>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

