import React from "react";

interface InfoFieldProps {
  label: string;
  value?: React.ReactNode;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value }) => {
  return (
    <div className="text-sm">
      <span className="font-semibold text-gray-700">{label}: </span>
      <span className="text-gray-900">{value ?? "N/A"}</span>
    </div>
  );
};

export default InfoField;