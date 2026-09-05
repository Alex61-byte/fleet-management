"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthShell, TextLink } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";

/** Retired temp-password gate — drivers use /invite?token=… */
export default function ChangePasswordPage() {
  const { me, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!me) {
      router.replace("/sign-in");
      return;
    }
    router.replace(me.role === "driver" ? "/driver" : "/home");
  }, [ready, me, router]);

  return (
    <AuthShell title="Invitation required" caption="Use the link from your invitation email to set a password.">
      <p className={themeClasses.caption}>Temporary passwords are no longer used.</p>
      <div className={themeClasses.authLinks}>
        <TextLink href="/sign-in">Back to sign in</TextLink>
      </div>
    </AuthShell>
  );
}
