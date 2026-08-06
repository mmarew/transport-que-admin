import type { DesignName } from "../../lib/authConfig";

export interface AuthTheme {
  outer: string;
  splitPanel: string;
  content: string;
  card: string;
  heading: string;
  subtitle: string;
  label: string;
  input: string;
  button: string;
  link: string;
  switchText: string;
  error: string;
  otpBox: string;
}

export const authThemes: Record<DesignName, AuthTheme> = {
  classic: {
    outer: "flex min-h-full items-center justify-center bg-slate-100 px-4",
    splitPanel: "hidden",
    content: "w-full max-w-sm",
    card: "rounded-xl bg-white p-8 shadow-lg",
    heading: "text-2xl font-bold text-slate-800",
    subtitle: "mt-1 text-sm text-slate-500",
    label: "block text-sm font-medium text-slate-700",
    input:
      "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
    button:
      "w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50",
    link: "font-semibold text-blue-600 hover:text-blue-700",
    switchText: "text-center text-sm text-slate-500",
    error: "mt-1 text-xs text-red-600",
    otpBox:
      "h-12 w-12 rounded-md border border-slate-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none",
  },
  split: {
    outer: "flex min-h-full",
    splitPanel:
      "hidden w-1/2 flex-col justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 p-12 lg:flex",
    content: "flex flex-1 items-center justify-center p-4 lg:p-12",
    card: "w-full max-w-sm rounded-xl bg-white p-8 shadow-lg",
    heading: "text-2xl font-bold text-slate-800",
    subtitle: "mt-1 text-sm text-slate-500",
    label: "block text-sm font-medium text-slate-700",
    input:
      "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
    button:
      "w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50",
    link: "font-semibold text-blue-600 hover:text-blue-700",
    switchText: "text-center text-sm text-slate-500",
    error: "mt-1 text-xs text-red-600",
    otpBox:
      "h-12 w-12 rounded-md border border-slate-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none",
  },
  glass: {
    outer:
      "flex min-h-full items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4",
    splitPanel: "hidden",
    content: "w-full max-w-sm",
    card: "rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl",
    heading: "text-2xl font-bold text-white",
    subtitle: "mt-1 text-sm text-slate-300",
    label: "block text-sm font-medium text-slate-200",
    input:
      "mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none",
    button:
      "w-full rounded-md bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50",
    link: "font-semibold text-indigo-300 hover:text-indigo-200",
    switchText: "text-center text-sm text-slate-300",
    error: "mt-1 text-xs text-red-400",
    otpBox:
      "h-12 w-12 rounded-md border border-white/20 bg-white/5 text-center text-lg font-semibold text-white focus:border-indigo-400 focus:outline-none",
  },
  minimal: {
    outer: "min-h-full bg-white px-4 pt-16",
    splitPanel: "hidden",
    content: "mx-auto w-full max-w-sm",
    card: "",
    heading: "text-xl font-bold text-slate-900",
    subtitle: "mt-1 text-sm text-slate-500",
    label: "block text-sm font-medium text-slate-700",
    input:
      "mt-1 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm focus:border-black focus:outline-none",
    button:
      "w-full rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50",
    link: "font-semibold text-slate-900 underline underline-offset-4",
    switchText: "text-center text-sm text-slate-500",
    error: "mt-1 text-xs text-red-600",
    otpBox:
      "h-12 w-12 rounded-full border border-slate-300 text-center text-lg font-semibold focus:border-black focus:outline-none",
  },
};
