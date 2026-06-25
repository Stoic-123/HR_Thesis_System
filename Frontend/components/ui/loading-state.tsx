"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  variant?: "card" | "table" | "profile" | "dashboard" | "detail";
  count?: number;
}

export function LoadingState({ variant = "card", count = 8 }: LoadingStateProps) {
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  };

  if (variant === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-3xl lg:col-span-1" />
          <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="space-y-8 max-w-350 mx-auto pb-12"
      >
        <div className="flex items-center justify-between">
          <div className="h-10 w-40 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-10 w-24 bg-rose-100 rounded-2xl animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-6">
            <Card className="apple-surface border-white/40 overflow-hidden pt-12">
              <CardContent className="flex flex-col items-center space-y-6 pb-10">
                <div className="h-40 w-40 rounded-[3.5rem] bg-gray-100 animate-pulse border-4 border-white" />
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className="h-8 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-50 rounded-md animate-pulse" />
                </div>
              </CardContent>
            </Card>
            <Card className="apple-surface border-white/40 h-48 animate-pulse" />
            <Card className="apple-surface border-white/40 h-48 animate-pulse" />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <Card className="apple-surface border-white/40 h-64 animate-pulse" />
            <Card className="apple-surface border-white/40 h-64 animate-pulse" />
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === "card") {
    return (
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {[...Array(count)].map((_, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className="apple-surface overflow-hidden border-white/40 h-[320px] flex flex-col">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-5 flex-1">
                <div className="relative">
                  <div className="h-24 w-24 rounded-[2rem] bg-gray-100 animate-pulse border border-white/60" />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white bg-gray-200 animate-pulse" />
                </div>
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className="h-6 w-3/4 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-50 rounded-md animate-pulse" />
                </div>
                <div className="w-full h-px bg-gray-100/50" />
                <div className="space-y-2 w-full">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-12 bg-gray-50 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
              <div className="px-6 py-4 bg-gray-50/50 border-t border-white/40 h-14" />
            </Card>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  if (variant === "table") {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        <Card className="overflow-hidden rounded-3xl border-border/50">
          <div className="flex items-center gap-2 border-b px-6 py-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="p-0">
            {[...Array(count)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-border/40 px-4 py-4 last:border-0"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-3 w-1/6" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[400px] space-y-8">
      <div className="relative h-16 w-16">
        <motion.div
          animate={{
            rotate: 360,
            borderRadius: ["25%", "50%", "25%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 border-2 border-primary/20 border-t-primary"
        />
      </div>
      <div className="text-center">
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50"
        >
          Refining Workspace
        </motion.p>
      </div>
    </div>
  );
}
