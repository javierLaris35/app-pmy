"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth.store"
import { getLandingRoute } from "@/lib/access/permissions"

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getLandingRoute(user))
    } else {
      router.replace("/login")
    }
  }, [isAuthenticated, user])

  return null
}
