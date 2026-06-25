"use client";

import React from "react";
import { motion } from "framer-motion";

export function SplashScreen() {

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/40 backdrop-blur-2xl overflow-hidden"
    >
      {/* Dynamic ambient background blobs for the glass effect */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: ["-10%", "10%", "-10%"],
            y: ["-10%", "10%", "-10%"],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: ["10%", "-10%", "10%"],
            y: ["10%", "-10%", "10%"],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[100px]"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Main Letter "វ" with Glass-adapted Netflix style */}
        <div className="relative scale-150">
          <motion.div
            initial={{ scale: 0.6, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.6,
              ease: [0.21, 1.02, 0.47, 0.98]
            }}
            className="relative z-10 text-[120px] font-black leading-none select-none font-bokor"
            style={{
              color: "#E50914",
              textShadow: "0 10px 30px rgba(229, 9, 20, 0.3), 0 0 0px rgba(0,0,0,0.1)",
            }}
          >
            វ
          </motion.div>

          {/* Vertical "Barcode" lines effect adapted for glass */}
          <div className="absolute inset-0 z-0 flex justify-center overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "100%", opacity: [0, 0.3, 0] }}
                transition={{
                  duration: 1.5,
                  delay: 0.8 + i * 0.05,
                  ease: "circOut",
                }}
                className="w-[2px] bg-linear-to-b from-[#E50914]/60 via-transparent to-transparent mx-[2px]"
              />
            ))}
          </div>
        </div>

        {/* Subtitle with fade in */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <h2 className="text-[#E50914] text-[10px] font-black uppercase tracking-[0.8em] pl-[0.8em]">
            Votmean
          </h2>
          <div className="h-[1px] w-12 bg-linear-to-r from-transparent via-[#E50914]/30 to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}
