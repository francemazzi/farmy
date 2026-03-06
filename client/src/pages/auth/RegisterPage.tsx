import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { UserRole } from "@/types";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENTE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(email, password, name, role);
      if (redirect) {
        navigate(redirect);
      } else if (user.role === "VENDITORE") {
        navigate("/vendor");
      } else {
        navigate("/my-orders");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante la registrazione",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Registrati</h2>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        id="name"
        label="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Il tuo nome"
        required
      />

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nome@esempio.it"
        required
      />

      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Minimo 6 caratteri"
        minLength={6}
        required
      />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Tipo di account
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("CLIENTE")}
            className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
              role === "CLIENTE"
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => setRole("VENDITORE")}
            className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
              role === "VENDITORE"
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Venditore
          </button>
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Registrati
      </Button>

      <p className="text-center text-sm text-gray-500">
        Hai gia un account?{" "}
        <Link
          to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Accedi
        </Link>
      </p>
    </form>
  );
}
