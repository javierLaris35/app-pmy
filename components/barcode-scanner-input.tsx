import React, { useRef, useState } from 'react';

const BarcodeScanner = () => {
  const [trackingNumbers, setTrackingNumbers] = useState([]);
  const textareaRef = useRef(null);

  const handleInput = (e) => {
    const value = e.target.value;
    console.log("🚀 ~ handleInput ~ value:", value)
    // Detectar si se ingresó un salto de línea (común en escáneres)
    if (value.includes('\n')) {
      // Tomar los últimos 12 dígitos del valor ingresado, ignorando el salto de línea
      const cleanedValue = value.trim();
      const last12Digits = cleanedValue.slice(-12);
      setTrackingNumbers((prev) => [...prev, last12Digits]);
      // Limpiar el textarea
      e.target.value = '';
    }
  };

  // Mantener el foco en el textarea
  const handleBlur = () => {
    textareaRef.current.focus();
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tracking Number
        </label>
        <textarea
          ref={textareaRef}
          className="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          onChange={handleInput}
          onBlur={handleBlur}
          autoFocus
          placeholder="Escanea un código de barras..."
        />
      </div>
      {trackingNumbers.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Códigos escaneados:</p>
          <ul className="list-disc pl-5">
            {trackingNumbers.map((number, index) => (
              <li key={index} className="text-sm font-bold">
                {number}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;