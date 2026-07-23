// components/configuracion/plantillas/test-send-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { testSend } from "@/lib/services/document-templates";
import { toast } from "@/lib/toast";

export function TestSendDialog({ code, sample }: { code: string; sample: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to.trim()) { toast.error?.("Escribe un destinatario"); return; }
    setSending(true);
    try { await testSend(code, { to: to.trim(), sampleData: sample }); toast.success?.("Correo de prueba enviado"); setOpen(false); }
    catch { toast.error?.("No se pudo enviar la prueba"); }
    finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Send className="h-4 w-4 mr-1" /> Enviar prueba</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar correo de prueba</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Label>Destinatario</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="correo@ejemplo.com" />
          <p className="text-[11px] text-muted-foreground">En ambiente de desarrollo el correo se redirige a la bandeja de sistemas.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={send} disabled={sending}>{sending ? "Enviando…" : "Enviar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
