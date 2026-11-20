// Tiny typed dictionary helper.
//
// Each namespace file declares French and English side by side:
//   export const home = dict({ title: "Bonjour" }, { title: "Hello" });
// TypeScript checks that English has exactly the same keys (and the same function
// signatures for interpolated strings), so a missing translation is a build error.

type Leaf = string | ((...args: never[]) => string);
export type Tree = { readonly [key: string]: Leaf | Tree };

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Bilingual<T> = { fr: Widen<T>; en: Widen<T> };

export function dict<const T extends Tree>(fr: T, en: Widen<T>): Bilingual<T> {
  return { fr: fr as unknown as Widen<T>, en };
}
