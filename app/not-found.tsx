import Image from "next/image"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center p-6">
      <div className="mb-6">
        <Image
          src="/logo-no-fondo.png"
          alt="Paquetería Del Yaqui"
          width={300}
          height={300}
          priority
        />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-red-700 mb-2">
        Página en construcción
      </h1>

      <p className="text-gray-700 text-lg mb-4">
        Lo sentimos, esta sección aún no está disponible o no fue encontrada.
      </p>

      <div className="animate-pulse text-red-500 font-semibold">
        🚧 Estamos trabajando en ello 🚧
      </div>
    </div>
  )
}
