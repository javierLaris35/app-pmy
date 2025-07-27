"use client"

import InventoryPageControl from "@/components/operaciones/inventory/inventory-page"
import {withAuth} from "@/hoc/withAuth";

function Inventory(){
    return <InventoryPageControl />
}

export default withAuth(Inventory, "operaciones.inventarios")