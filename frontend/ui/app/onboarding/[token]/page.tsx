import { notFound } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

// Obtener la URL base desde las variables de entorno o fallback a localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getClienteData(token: string) {
  try {
    const res = await fetch(`${API_URL}/onboarding/${token}`, {
      cache: "no-store", // No cachear para tener siempre la info más reciente
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch data");
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return null;
  }
}

export default async function OnboardingPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getClienteData(params.token);

  if (!data) {
    // Si no se encuentra el token o es inválido, mostramos página 404 de Next.js
    notFound();
  }

  return <OnboardingForm initialData={data} token={params.token} />;
}
