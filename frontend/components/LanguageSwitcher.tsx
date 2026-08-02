"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/src/i18n/routing";
import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const newLocale = locale === "km" ? "en" : "km";
    // Strip any existing locale prefix to prevent double-prefix bug (/km/km/...)
    const unlocalizedPath = pathname.replace(/^\/(km|en)(\/|$)/, "/");
    startTransition(() => {
      router.push(unlocalizedPath === "" ? "/" : unlocalizedPath, {
        locale: newLocale,
      });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      disabled={isPending}
      className="h-9 gap-1.5 rounded-xl border border-white/60 bg-white/70 px-3 text-xs font-bold text-muted-foreground hover:bg-white/80 hover:text-foreground"
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Languages className="size-3.5" />
      )}
      {locale === "km" ? "EN" : "KM"}
    </Button>
  );
}
