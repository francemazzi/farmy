import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/api/client";

export function SetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient("/setup/init", {
        method: "POST",
        body: { email, password, name },
      });
      navigate("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore durante il setup",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-earth-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600">
            <Sprout className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Farmy</h1>
          <p className="text-sm text-gray-500">Configurazione iniziale</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Crea il tuo account amministratore
            </h2>
            <p className="text-sm text-gray-500">
              Questo sarà il primo account venditore della piattaforma.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              id="name"
              label="Nome"
              type="text"
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
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Crea account e inizia
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
