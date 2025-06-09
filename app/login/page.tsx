"use client"

import { LoginForm } from "@/components/login-form"
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { isAuthenticated, user, hasHydrated } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (hasHydrated && isAuthenticated && user) {
        router.replace("/dashboard");
        }
    }, [hasHydrated, isAuthenticated, user]);

    if (!hasHydrated) {
        return <p className="text-center mt-10">Cargando...</p>;
    }

    if (isAuthenticated && user) {
        return null; // ya redireccionó
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="relative hidden bg-muted lg:block">
                <img
                    src="/placeholder.jpg"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>
        </div>
    )
}
