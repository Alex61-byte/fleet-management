"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthShell, TextLink } from "../../components/ui";
import { themeClasses } from "../../../../design/tailwind.theme";
import { useAuth } from "../../lib/auth-context";

function KindOption({
  href,
  title,
  supporting,
  a11y,
}: {
  href: string;
  title: string;
  supporting: string;
  a11y: string;
}) {
  return (
    <Link
      href={href}
      aria-label={a11y}
      className="min-h-hit flex flex-col gap-0.5 rounded-md border border-border bg-surface-raised px-3 py-2 hover:bg-canvas focus-visible:shadow-ring"
    >
      <span className={`${themeClasses.label} font-semibold`}>{title}</span>
      <span className={`${themeClasses.caption} text-text-secondary`}>{supporting}</span>
    </Link>
  );
}

export default function AccountKindPage() {
  const { me, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || !me) return;
    if (me.role === "driver") router.replace("/driver");
    else router.replace("/home");
  }, [ready, me, router]);

  if (ready && me) {
    return (
      <main className={`${themeClasses.pageAuth} min-h-screen p-3`}>
        <div className="h-6 w-40 bg-disabled-surface rounded-md" aria-busy="true" />
      </main>
    );
  }

  return (
    <AuthShell title="Create account" caption="Choose how you will use Fleet.">
      <div className="flex flex-col gap-2 mt-2" role="group" aria-label="Account type">
        <KindOption
          href="/sign-up"
          title="Company"
          supporting="Register an organization. Manage drivers and vehicles."
          a11y="Company. Register an organization. Manage drivers and vehicles."
        />
        <KindOption
          href="/individual-sign-up"
          title="Individual"
          supporting="Personal account. Manage your own vehicles only."
          a11y="Individual. Personal account. Manage your own vehicles only."
        />
      </div>
      <div className={themeClasses.authLinks}>
        <TextLink href="/sign-in">Already have an account? Sign in</TextLink>
      </div>
    </AuthShell>
  );
}
