'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SHIPMENT_STATUS_MAP, DEVOLUTION_REASON_MAP } from '@/lib/constants';

type SelectStatusProps = {
  value?: string;
  exceptionCode?: string | null;
  reason?: string;
  onChange: (value: string) => void;
  onReasonChange?: (reason: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SelectStatus({
                               value = '',
                               exceptionCode = null,
                               reason = '',
                               onChange,
                               onReasonChange,
                               placeholder = 'Selecciona un estatus',
                               disabled = false,
                             }: SelectStatusProps) {
  const statusOptions = useMemo(() =>
          Object.entries(SHIPMENT_STATUS_MAP).map(([code, label]) => ({
            value: code,
            label: label
          })),
      []);

  return (
      <div className="space-y-2">
        <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
                <SelectItem
                    key={option.value}
                    value={option.value}
                >
                  {option.label}
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
  );
}