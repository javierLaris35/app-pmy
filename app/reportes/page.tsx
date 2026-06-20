"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth";
import { OperationHeader } from "@/components/shared/operation-header";
import { Card, CardContent } from "@/components/ui/card";
import { REPORTS } from "@/components/reportes/report-registry";
import { ReportRunner } from "@/components/reportes/report-runner";

function ReportesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = REPORTS.find((r) => r.id === selectedId) || null;

  return (
    <AppLayout>
      <div className="space-y-5">
        <OperationHeader
          icon={FileSpreadsheet}
          title="Reportes"
          description={selected ? selected.title : "Genera y exporta reportes operativos"}
        />

        {!selected ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              return (
                <button key={r.id} type="button" onClick={() => setSelectedId(r.id)} className="text-left">
                  <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-start gap-3 p-5">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${r.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{r.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        ) : (
          <ReportRunner def={selected} onBack={() => setSelectedId(null)} />
        )}
      </div>
    </AppLayout>
  );
}

export default withAuth(ReportesPage, "reportes");
