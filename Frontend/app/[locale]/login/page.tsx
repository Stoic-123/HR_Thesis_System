"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/src/i18n/routing";
import { api } from "@/lib/api";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";

import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const LoginPage = () => {
  const router = useRouter();
  const t = useTranslations("login");

  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/auth/forgot-password", {
        username: forgotUsername,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("forgotPasswordSuccess"));
      setIsForgotOpen(false);
      setForgotUsername("");
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || t("forgotPasswordError")
      );
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/auth/login", {
        username,
        password,
      });

      return res.data;
    },

    onSuccess: () => {
      toast.success("Login successful");

      router.push("/dashboard");
      router.refresh();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Invalid username or password",
      );
    },
  });

  return (
    <div className="min-h-screen bg-body px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground font-bokor pt-0.5">
            វ
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground/90">
            votmean
          </h1>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 rounded-4xl border border-white/55 bg-white/60 p-4 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:grid-cols-12 lg:p-6">
        <form
          className="lg:col-span-4 lg:p-4"
          onSubmit={(e) => {
            e.preventDefault();

            loginMutation.mutate();
          }}
        >
          <FieldGroup>
            <FieldSet>
              <h1 className="text-3xl font-semibold tracking-tight">
                {t("title")}
              </h1>

              <FieldDescription className="mt-3 text-muted-foreground">
                {t("subtitle")}
              </FieldDescription>

              <FieldGroup className="pt-6">
                <Field>
                  <FieldLabel htmlFor="username">{t("username")}</FieldLabel>

                  <Input
                    id="username"
                    value={username}
                    required
                    placeholder={t("usernamePlaceholder")}
                    className="h-11 rounded-2xl border-border/70 bg-background px-4 shadow-none focus:border-primary"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </Field>

                {/* PASSWORD */}
                <Field>
                  <FieldLabel>{t("password")}</FieldLabel>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      required
                      placeholder={t("passwordPlaceholder")}
                      className="h-11 rounded-2xl border-border/70 bg-background px-4 pr-10 shadow-none focus:border-primary"
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotUsername(username);
                        setIsForgotOpen(true);
                      }}
                      className="text-xs font-semibold text-primary hover:underline hover:text-primary/95 transition-colors cursor-pointer"
                    >
                      {t("forgotPassword")}
                    </button>
                  </div>
                </Field>
              </FieldGroup>
            </FieldSet>

            {/* ERROR MESSAGE */}
            {loginMutation.isError && (
              <p className="pt-3 text-sm text-red-500">
                {t("loginError")}
              </p>
            )}

            {/* BUTTON */}
            <Field className="pt-6" orientation="horizontal">
              <Button
                type="submit"
                disabled={loginMutation.isPending || !username || !password}
                className="h-11 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loginMutation.isPending ? t("loggingIn") : t("loginBtn")}
              </Button>
            </Field>
          </FieldGroup>
        </form>

        {/* RIGHT SIDE */}
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-muted lg:col-span-8">
          <img
            className="h-full w-full object-cover"
            src="/image/login-image-2.png"
            alt="login"
          />
        </div>
      </div>

      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("forgotPasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("forgotPasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Field>
              <FieldLabel htmlFor="forgot-username">{t("username")}</FieldLabel>
              <Input
                id="forgot-username"
                value={forgotUsername}
                placeholder={t("usernamePlaceholder")}
                onChange={(e) => setForgotUsername(e.target.value)}
                className="h-11 rounded-2xl border-border/70 bg-background px-4 shadow-none focus:border-primary"
              />
            </Field>
          </div>
          <DialogFooter className="flex sm:justify-between items-center">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="rounded-2xl"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={forgotPasswordMutation.isPending || !forgotUsername.trim()}
              onClick={() => forgotPasswordMutation.mutate()}
              className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {forgotPasswordMutation.isPending ? t("submitting") : t("forgotPasswordBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
