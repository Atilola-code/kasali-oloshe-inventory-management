// src/app/login/page.tsx
"use client";
import LoginPage from "@/app/components/auth/LoginPage";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/'); // Redirect to dashboard after login
  };

  return <LoginPage onSuccess={handleSuccess} />;
}