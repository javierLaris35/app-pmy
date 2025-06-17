"use client"
import Image from "next/image"
import React from "react"

const UnderConstruction: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-6">
      <div className="mb-6">
        <Image
          src="/logo-no-fondo.png"
          alt="Paquetería Del Yaqui"
          width={160}
          height={160}
          priority
        />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-red-700 mb-2">
        Sistema en construcción
      </h1>

      <p className="text-gray-700 text-lg mb-4">
        Estamos trabajando para brindarte una mejor experiencia.
      </p>

      <div className="animate-pulse text-red-500 font-semibold">
        🚧 Próximamente disponible 🚧
      </div>
    </div>
  )
}

export default UnderConstruction
