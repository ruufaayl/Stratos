"use client";
import * as React from "react";
import * as SignUp from "@clerk/elements/sign-up";
import * as Clerk from "@clerk/elements/common";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthLink } from "@/components/auth/auth-link";
import { OtpInput } from "@/components/auth/otp-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Verification step uses the useSignUp hook directly rather than
 * <Clerk.Input asChild> because OtpInput is a multi-cell component
 * that doesn't compose cleanly with Elements' single-input slot.
 * (Option B from the plan — hook fallback for verifications step.)
 */
function EmailVerificationStep() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const handleCodeComplete = React.useCallback(
    async (finalCode: string) => {
      if (!isLoaded || !signUp || finalCode.length < 6) return;
      setVerifying(true);
      setError(null);
      try {
        const result = await signUp.attemptEmailAddressVerification({
          code: finalCode,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          // TODO(Task 10): Replace with postAuthRedirectFor() once membership-aware
          // redirect logic is implemented. For now hardcoded to /orgs/create.
          router.push("/orgs/create");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Verification failed";
        setError(msg);
      } finally {
        setVerifying(false);
      }
    },
    [isLoaded, signUp, setActive, router],
  );

  const handleChange = (v: string) => {
    setCode(v);
    if (v.length === 6) {
      void handleCodeComplete(v);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle="We sent a 6-digit code to your email address."
    >
      <div className="space-y-4">
        <OtpInput value={code} onChange={handleChange} />
        {error && (
          <p className="text-waste-500 text-mono-sm text-center">{error}</p>
        )}
        {verifying && (
          <p className="text-text-muted text-mono-sm text-center">
            Verifying…
          </p>
        )}
      </div>
    </AuthCard>
  );
}

export default function SignUpPage() {
  return (
    <SignUp.Root>
      {/* ── Step 1: collect email + password ── */}
      <SignUp.Step name="start">
        <AuthCard
          title="Create your account"
          subtitle={
            <>
              Already have one?{" "}
              <AuthLink href="/sign-in">Sign in</AuthLink>
            </>
          }
        >
          <Clerk.Field name="emailAddress">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              Work email
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="email" autoComplete="email" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <Clerk.Field name="password">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">
              Password
            </Clerk.Label>
            <Clerk.Input asChild>
              <Input type="password" autoComplete="new-password" required />
            </Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>

          <SignUp.Action submit asChild>
            <Button className="w-full" type="submit">
              Create account
            </Button>
          </SignUp.Action>
        </AuthCard>
      </SignUp.Step>

      {/* ── Step 2: email OTP verification (hook-driven, see EmailVerificationStep) ── */}
      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <EmailVerificationStep />
        </SignUp.Strategy>
      </SignUp.Step>
    </SignUp.Root>
  );
}
