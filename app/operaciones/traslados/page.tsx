"use client"

import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth"
import Transfer from "@/components/operaciones/transfers/transfer";

function TransferPage() {
    return (
        <AppLayout>
            <Transfer />
        </AppLayout>
    )
    
}


export default withAuth(TransferPage, "operaciones.traslados")