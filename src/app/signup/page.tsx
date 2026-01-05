// src/app/signup/page.tsx
"use client";
import SignupPage from "@/app/components/auth/SignupPage";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Signup() {
  const router = useRouter();
  const [showModal] = useState(true);

  const handleClose = () => {
    router.push('/login'); // Redirect to login after successful signup
  };

  if (!showModal) return null;

  return <SignupPage onClose={handleClose} />;
}