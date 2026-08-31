import { en } from "./en";
import { am } from "./am";

export type Language = "en" | "am";

export const translations = {
  en,
  am,
};

type DotNotation<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends string
    ? Prefix extends ""
      ? `${string & K}`
      : `${Prefix}.${string & K}`
    : Prefix extends ""
      ? DotNotation<T[K], `${string & K}`>
      : DotNotation<T[K], `${Prefix}.${string & K}`>;
}[keyof T];

export type TranslationKey = DotNotation<typeof en>;
