export function FedExLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="bg-purple-600 text-white px-3 py-2 font-bold text-2xl rounded-sm">Fed</div>
      <div className="bg-orange-500 text-white px-3 py-2 font-bold text-2xl rounded-sm">Ex</div>
    </div>
  )
}
