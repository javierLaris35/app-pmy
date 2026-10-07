import { redirect } from "next/navigation";

/** La bandeja se mudó a su propio menú (Correos). Se conserva para enlaces viejos y avisos ya enviados. */
export default function BandejaCorreosMovida() {
  redirect("/correos/bandeja");
}
