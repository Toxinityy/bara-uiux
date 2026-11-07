export function resolveTheme(
  saved: string | null,
  prefersDark: boolean,
): "light" | "dark" {
  return saved === "light" || saved === "dark"
    ? saved
    : prefersDark
      ? "dark"
      : "light";
}
