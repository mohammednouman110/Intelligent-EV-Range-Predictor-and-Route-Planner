import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Mail, User, UserPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { logIn, signUp, session } from "@/lib/api";

type Mode = "login" | "signup";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && !name.trim()) {
      setError("Name is required to create an account.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = mode === "signup"
        ? await signUp(name.trim(), email.trim(), password)
        : await logIn(email.trim(), password);
      session.onAuthenticated(result);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-100 px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary">
            <Zap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">EV Route Planner</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to plan your next journey</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "outline"}
              onClick={() => { setMode("login"); setError(""); }}
              className="w-full"
            >
              <LogIn className="mr-1 h-4 w-4" /> Sign in
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "default" : "outline"}
              onClick={() => { setMode("signup"); setError(""); }}
              className="w-full"
            >
              <UserPlus className="mr-1 h-4 w-4" /> Sign up
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  required={mode === "signup"}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            {error && (
              <div className="space-y-2">
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
                {error.toLowerCase().includes("rate limit") && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <p className="font-semibold">How to fix email rate limit issue:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-1">
                      <li><strong>Supabase Dashboard:</strong> Go to <em>Authentication &rarr; Rate Limits</em> and increase signups/hour limit.</li>
                      <li><strong>Disable Confirmation:</strong> Go to <em>Authentication &rarr; Providers &rarr; Email</em> and turn off &quot;Confirm email&quot;.</li>
                      <li><strong>Use Existing Account:</strong> Switch to &quot;Sign in&quot; using a previously created email.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            <Button type="submit" disabled={loading} className="h-12 w-full">
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
