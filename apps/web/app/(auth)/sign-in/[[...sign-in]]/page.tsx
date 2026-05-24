"use client";
import * as React from "react";
import * as SignIn from "@clerk/elements/sign-in";
import * as Clerk from "@clerk/elements/common";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthLink } from "@/components/auth/auth-link";
import { OtpInput } from "@/components/auth/otp-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Hook-driven OTP verification (email_code or totp strategy) ──────────────
// Clerk Elements' <Clerk.Input asChild> doesn't compose cleanly with multi-cell
// OtpInput, so we fall back to the useSignIn hook for these sub-steps.
// (Same Option B approach used in /sign-up verifications.)

function EmailCodeVerification() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const attemptVerification = React.useCallback(
    async (finalCode: string) => {
      if (!isLoaded || !signIn || finalCode.length < 6) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: finalCode,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.push("/post-auth");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setVerifying(false);
      }
    },
    [isLoaded, signIn, setActive, router],
  );

  const handleChange = (v: string) => {
    setCode(v);
    if (v.length === 6) void attemptVerification(v);
  };

  return (
    <AuthCard title="Check your email" subtitle="Enter the 6-digit code we sent you.">
      <OtpInput value={code} onChange={handleChange} />
      {error && <p className="text-waste-500 text-mono-sm text-center">{error}</p>}
      {verifying && <p className="text-text-muted text-mono-sm text-center">Verifying…</p>}
    </AuthCard>
  );
}

function TotpVerification() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const attemptVerification = React.useCallback(
    async (finalCode: string) => {
      if (!isLoaded || !signIn || finalCode.length < 6) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await signIn.attemptSecondFactor({
          strategy: "totp",
          code: finalCode,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.push("/post-auth");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setVerifying(false);
      }
    },
    [isLoaded, signIn, setActive, router],
  );

  const handleChange = (v: string) => {
    setCode(v);
    if (v.length === 6) void attemptVerification(v);
  };

  return (
    <AuthCard
      title="Authenticator code"
      subtitle="Enter the 6-digit code from your authenticator app."
    >
      <OtpInput value={code} onChange={handleChange} />
      {error && <p className="text-waste-500 text-mono-sm text-center">{error}</p>}
      {verifying && <p className="text-text-muted text-mono-sm text-center">Verifying…</p>}
    </AuthCard>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SignInPage() {
  return (
    <SignIn.Root>
      {/* ── Step 1: email + password ── */}
      <SignIn.Step name="start">
        <AuthCard
          title="Sign in to Stratos"
          subtitle={
            <>
              Don&apos;t have an account?{" "}
              <AuthLink href="/sign-up">Sign up</AuthLink>
            </>
          }
        >
          <Clerk.Field name="identifier">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              Work email
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="email" autoComplete="email" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <Clerk.Field name="password">
            <div className="flex items-center justify-between mb-1.5">
              <Clerk.Label className="text-sm text-text-muted font-mono">
                Password
              </Clerk.Label>
              <SignIn.Action navigate="forgot-password" asChild>
                <AuthLink href="#">Forgot password?</AuthLink>
              </SignIn.Action>
            </div>
            <Clerk.Input asChild>
              <Input type="password" autoComplete="current-password" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <SignIn.Action submit asChild>
            <Button className="w-full" type="submit">
              Sign in
            </Button>
          </SignIn.Action>
        </AuthCard>
      </SignIn.Step>

      {/* ── Step 2: MFA / second factor ── */}
      <SignIn.Step name="verifications">
        {/* Email OTP challenge */}
        <SignIn.Strategy name="email_code">
          <EmailCodeVerification />
        </SignIn.Strategy>

        {/* TOTP authenticator app */}
        <SignIn.Strategy name="totp">
          <TotpVerification />
        </SignIn.Strategy>

        {/* Password fallback (e.g. after OAuth, reauth flow) */}
        <SignIn.Strategy name="password">
          <AuthCard title="Confirm your password">
            <Clerk.Field name="password">
              <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
                Password
              </Clerk.Label>
              <Clerk.Input asChild>
                <Input type="password" autoComplete="current-password" required />
              </Clerk.Input>
              <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
            </Clerk.Field>
            <SignIn.Action submit asChild>
              <Button className="w-full" type="submit">
                Continue
              </Button>
            </SignIn.Action>
          </AuthCard>
        </SignIn.Strategy>
      </SignIn.Step>

      {/* ── Step 3: forgot password — enter email ── */}
      <SignIn.Step name="forgot-password">
        <AuthCard
          title="Reset your password"
          subtitle="We'll send a reset link to your email."
        >
          <Clerk.Field name="identifier">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              Work email
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="email" autoComplete="email" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <SignIn.Action submit asChild>
            <Button className="w-full" type="submit">
              Send reset link
            </Button>
          </SignIn.Action>

          <div className="text-center">
            <SignIn.Action navigate="start" asChild>
              <AuthLink href="#">Back to sign in</AuthLink>
            </SignIn.Action>
          </div>
        </AuthCard>
      </SignIn.Step>

      {/* ── Step 4: reset password — enter new password ── */}
      <SignIn.Step name="reset-password">
        <AuthCard
          title="Choose a new password"
          subtitle="Must be at least 8 characters."
        >
          <Clerk.Field name="password">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              New password
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="password" autoComplete="new-password" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <Clerk.Field name="confirmPassword">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              Confirm new password
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="password" autoComplete="new-password" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <SignIn.Action submit asChild>
            <Button className="w-full" type="submit">
              Reset password
            </Button>
          </SignIn.Action>
        </AuthCard>
      </SignIn.Step>
    </SignIn.Root>
  );
}
