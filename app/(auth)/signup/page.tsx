"use client";

import { useState, FormEvent } from "react";

type FormState = {
  kind: "form";
};

type SuccessState = {
  kind: "success";
  inviteLink: string;
};

type PageState = FormState | SuccessState;

export default function SignupPage(): React.ReactElement {
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<PageState>({ kind: "form" });
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, email, password }),
      });

      if (res.ok) {
        const data = (await res.json()) as { inviteLink?: string };
        setState({
          kind: "success",
          inviteLink: data.inviteLink ?? "",
        });
        return;
      }

      let errorMessage = "Signup failed. Please try again.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) {
          errorMessage = data.error;
        }
      } catch {
        // Ignore JSON parse errors; use default message.
      }

      setError(errorMessage);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(link: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore.
    }
  }

  if (state.kind === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <h1 className="mb-4 text-2xl font-bold">Account created!</h1>
          <p className="mb-4 text-sm">
            Share this invite link with your developers so they can register
            their machines:
          </p>
          <div className="mb-4 flex items-center gap-2 rounded border bg-gray-50 p-3">
            <code className="flex-1 break-all text-sm">{state.inviteLink}</code>
            <button
              type="button"
              onClick={() => void handleCopy(state.inviteLink)}
              className="shrink-0 rounded bg-black px-3 py-1.5 text-xs font-medium text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Developers will use this link when running{" "}
            <code>df-onboard</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="orgName" className="mb-1 block text-sm font-medium">
              Organization name
            </label>
            <input
              id="orgName"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              disabled={loading}
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
          {error !== null && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
