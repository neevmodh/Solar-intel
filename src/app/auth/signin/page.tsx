"use client";

import { signIn, getProviders } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Zap, Shield } from "lucide-react";

type Provider = { id: string; name: string; type: string; signinUrl: string; callbackUrl: string };

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);

  useEffect(() => {
    getProviders().then((p) => setProviders(p as Record<string, Provider> | null));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#1a0a2e] to-[#0a0a0f] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-6"
            >
              <Sun className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-3xl font-bold text-white mb-2">
              Solar <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Intel</span>
            </h1>
            <p className="text-white/50 text-sm">
              AI-Driven Solar Inverter Intelligence Platform
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: Zap, label: "Real-time" },
              { icon: Shield, label: "Secure" },
              { icon: Sun, label: "AI-Powered" },
            ].map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5"
              >
                <Icon className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] text-white/40">{label}</span>
              </motion.div>
            ))}
          </div>

          {/* Sign In Buttons */}
          <div className="space-y-3">
            {providers ? (
              Object.values(providers).map((provider) => (
                <motion.button
                  key={provider.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    provider.id === "dev-login"
                      ? signIn("dev-login", { callbackUrl: "/", email: "dev@solar-intel.local" })
                      : signIn(provider.id, { callbackUrl: "/" })
                  }
                  className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl
                    font-semibold text-sm shadow-lg transition-colors duration-200
                    ${provider.id === "dev-login"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20"
                      : "bg-white text-gray-900 hover:bg-gray-100 shadow-white/10"
                    }`}
                >
                  {/* Google icon */}
                  {provider.id === "google" && (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {/* Dev icon */}
                  {provider.id === "dev-login" && (
                    <Zap className="w-5 h-5 text-amber-300" />
                  )}
                  {provider.id === "dev-login" ? "Dev Login (Skip Auth)" : `Continue with ${provider.name}`}
                </motion.button>
              ))
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-white/25 mt-8">
            By signing in you agree to our Terms of Service.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
