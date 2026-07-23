"use client"

import { Suspense } from "react"
import InventoryPageControl from "@/components/operaciones/inventory/inventory-page"
import {withAuth} from "@/hoc/withAuth";

function Inventory(){
    return <Suspense fallback={null}><InventoryPageControl /></Suspense>
}

export default withAuth(Inventory, "bodega.inventarios")