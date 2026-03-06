import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="mt-2 text-lg text-gray-600">Pagina non trovata</p>
        <div className="mt-6">
          <Link to="/">
            <Button>Torna alla home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
