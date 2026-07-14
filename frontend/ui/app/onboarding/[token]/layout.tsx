import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ficha de Cliente | OfiSolve",
  description: "Complete sus datos de forma segura para la escribanía.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white dark:from-blue-950 dark:via-slate-950 dark:to-black transition-colors duration-500">
      <div className="w-full max-w-2xl">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/10 mb-6 border border-slate-200 dark:border-slate-800">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ficha de Datos Personales
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Por favor, complete o verifique su información. Sus datos están protegidos.
          </p>
        </header>

        <main className="relative">{children}</main>

        <footer className="mt-12 text-center text-sm text-slate-500 dark:text-slate-500">
          <p>Protegido mediante encriptación de extremo a extremo.</p>
          <p className="mt-1 font-medium">OfiSolve Sistema Notarial</p>
        </footer>
      </div>
    </div>
  );
}
