"use client"

// Tooltip Profesional para las gráficas web
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-xl ring-1 ring-black/5 z-50">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const itemColor = entry.dataKey === 'efectividad' && entry.payload.efectividad
              ? (entry.payload.efectividad >= 90 ? '#10b981' : entry.payload.efectividad >= 75 ? '#f59e0b' : '#f43f5e')
              : entry.color;

            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: itemColor }} />
                  <span className="text-muted-foreground">{entry.name}:</span>
                </div>
                <span className="font-medium text-foreground">
                  {entry.value}{entry.name.includes('%') || entry.dataKey === 'efectividad' ? '%' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  let color = "#10b981";
  if (payload.efectividad < 90 && payload.efectividad >= 75) color = "#f59e0b";
  if (payload.efectividad < 75) color = "#f43f5e";
  return <circle cx={cx} cy={cy} r={5} stroke="hsl(var(--background))" strokeWidth={2} fill={color} />;
};
