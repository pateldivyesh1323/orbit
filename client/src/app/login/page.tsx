import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your Orbit profile, memory, and integrations."
    >
      <LoginForm />
    </AuthShell>
  );
}
