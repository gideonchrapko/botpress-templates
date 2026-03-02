"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="w-full"
      size="lg"
    >
      Sign in with your Botpress gmail
    </Button>
  );
}

