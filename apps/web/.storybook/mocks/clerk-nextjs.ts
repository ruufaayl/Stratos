/**
 * Storybook mock for @clerk/nextjs.
 * Provides stable stub implementations of the hooks used in UserMenu and other shell components.
 */

export function useUser() {
  return {
    user: {
      fullName: "Alex Demo",
      primaryEmailAddress: { emailAddress: "alex@example.com" },
      publicMetadata: { staff: false },
    },
    isLoaded: true,
    isSignedIn: true,
  };
}

export function useClerk() {
  return {
    signOut: async () => {},
    openUserProfile: () => {},
  };
}

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "user_demo",
  };
}

export function useOrganization() {
  return { organization: null, isLoaded: true };
}

export function SignIn() {
  return null;
}

export function SignUp() {
  return null;
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}

import * as React from "react";
