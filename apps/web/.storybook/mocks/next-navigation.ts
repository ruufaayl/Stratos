/**
 * Storybook mock for next/navigation.
 * Returns stable no-op implementations so shell components compile and render.
 */

export function useRouter() {
  return {
    push: (_url: string) => {},
    replace: (_url: string) => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: (_url: string) => {},
  };
}

export function usePathname() {
  return "/app/acme";
}

export function useParams() {
  return { org: "acme" };
}

export function useSearchParams() {
  return new URLSearchParams();
}
