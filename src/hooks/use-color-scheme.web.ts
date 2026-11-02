import { useEffect, useState } from "react";

export function useColorScheme(): "light" | "dark" {
  const getValue = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const [value, setValue] = useState<"light" | "dark">(getValue);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setValue(media.matches ? "dark" : "light");

    handler();
    media.addEventListener("change", handler);

    return () => media.removeEventListener("change", handler);
  }, []);

  return value;
}
