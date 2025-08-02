import jsPDF from "jspdf";
import { Driver, PackageInfo, Route, Vehicles } from "../types";
import { format, toZonedTime } from "date-fns-tz";

export class EnhancedFedExPDFGeneratorPackagDispatch {
    private drivers: Driver[];
    private routes: Route[];
    private vehicle: Vehicles;
    private packages: PackageInfo[];
    private subsidiaryName: string;

    constructor(drivers: Driver[], routes: Route[], vehicle: Vehicles, packages: PackageInfo[], subsidiaryName: string) {
        this.drivers = drivers;
        this.routes = routes;
        this.vehicle = vehicle;
        this.packages = packages;
        this.subsidiaryName = subsidiaryName;
    }

    private async loadPmyLog(): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => reject(new Error("Failed to load FedEx logo"));
            img.src = "/logo-no-fondo.png";
        });
    }

    private drawHeader(doc: jsPDF, logoDataUrl?: string): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 0, pageWidth, 30, "F");
        try {
            if (logoDataUrl) {
                doc.addImage(logoDataUrl, "PNG", 5, 1, 33, 33);
            } else {
                throw new Error("No logo provided");
            }
        } catch (error) {
            console.warn("Using fallback logo:", error);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(102, 45, 145);
            doc.text("Fed", 15, 20);
            doc.setTextColor(255, 102, 0);
            doc.text("Ex", 38, 20);
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text("®", 55, 15);
        }
        doc.setTextColor(0, 0, 0);
        const currentDate = new Date().toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("FECHA", pageWidth - 50, 12);
        doc.setLineWidth(0.5);
        doc.rect(pageWidth - 50, 15, 40, 10);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(currentDate, pageWidth - 47, 22);
        return 30;
    }

    private drawLocationSection(doc: jsPDF, startY: number): number {
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("SALIDA A RUTA", 125, 7);
        const drivers = this.drivers.map(driver => driver.name).join(" - ");
        const routes = this.routes.map(route => route.name).join(" -> ");
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("A cargo de:", 45, 13);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(drivers, 70, 13);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Localidad:", 45, 18);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(this.subsidiaryName.toUpperCase(), 70, 18);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text("Ruta a Seguir:", 45, 23);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(routes, 75, 23);
        doc.setTextColor(60, 60, 60);
        doc.text("Unidad:", 45, 28);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(this.vehicle.name, 62, 28);

        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text('Simbología: [C] Carga/F2/31.5   [$] Con pago   [H] Valor alto', 5, 35);

        return startY + 8;
    }

    private drawPackageSection(doc: jsPDF, startY: number): number {
        const timeZone = 'America/Hermosillo';
        const pageHeight = doc.internal.pageSize.getHeight(); // 210mm for A4 landscape
        const rowHeight = 6;
        const headerHeight = 8;
        const marginBottom = 10; // Bottom margin
        const maxY = pageHeight - marginBottom; // Maximum Y position before new page
        let currentY = startY;

        const drawTableHeader = (y: number) => {
            doc.setFillColor(157, 81, 55);
            doc.rect(5, y, 10, headerHeight, "FD"); // No.
            doc.rect(15, y, 21, headerHeight, "FD"); // No. Guia
            doc.rect(36, y, 60, headerHeight, "FD"); // Nombre
            doc.rect(96, y, 62, headerHeight, "FD"); // Dirección
            doc.rect(156, y, 12, headerHeight, "FD"); // Cobro
            doc.rect(168, y, 17, headerHeight, "FD"); // Fecha
            doc.rect(185, y, 15, headerHeight, "FD"); // Hora
            doc.rect(200, y, 20, headerHeight, "FD"); // Celular
            doc.rect(220, y, 75, headerHeight, "FD"); // Nombre y Firma
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text("No", 8, y + 5);
            doc.text("NO. GUIA", 18, y + 5);
            doc.text("NOMBRE", 40, y + 5);
            doc.text("DIRECCION", 100, y + 5);
            doc.text("COBRO", 156, y + 5);
            doc.text("FECHA", 171, y + 5);
            doc.text("HORA", 187, y + 5);
            doc.text("CEL", 202, y + 5);
            doc.text("NOMBRE Y FIRMA", 222, y + 5);
        };

        // Draw initial table header
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        drawTableHeader(currentY);
        currentY += headerHeight;

        for (let i = 0; i < this.packages.length; i++) {
            // Check if there's enough space for the next row
            if (currentY + rowHeight > maxY) {
                doc.addPage();
                currentY = 10; // Start at top of new page (adjust if needed)
                drawTableHeader(currentY);
                currentY += headerHeight;
            }

            const packageInfo = this.packages[i];
            const isEven = i % 2 === 0;

            if (isEven) {
                doc.setFillColor(252, 252, 252);
                doc.rect(15, currentY, 95, rowHeight, "F");
            }

            doc.setDrawColor(220, 220, 220);
            doc.rect(5, currentY, 10, rowHeight); // No.
            doc.rect(15, currentY, 21, rowHeight); // No. Guia
            doc.rect(36, currentY, 60, rowHeight); // Nombre
            doc.rect(96, currentY, 60, rowHeight); // Direccion
            doc.rect(156, currentY, 12, rowHeight); // CP
            doc.rect(168, currentY, 17, rowHeight); // Fecha
            doc.rect(185, currentY, 15, rowHeight); // Hora
            doc.rect(200, currentY, 20, rowHeight); // Celular
            doc.rect(220, currentY, 75, rowHeight); // Nombre y Firma

            if (packageInfo) {
                const recipientName = packageInfo.recipientName || "";
                const recipientAddress = packageInfo.recipientAddress || "";
                const payment = packageInfo?.payment?.amount || "";
                const recipientPhone = packageInfo.recipientPhone || "";
                const zonedDate = toZonedTime(new Date(packageInfo.commitDateTime), timeZone);
                const commitDate = format(zonedDate, 'yyyy-MM-dd', { timeZone });
                const commitTime = format(zonedDate, 'HH:mm:ss', { timeZone });
                let icons = '';

                if (packageInfo.isCharge) icons += '[C]';
                if (packageInfo.payment) icons += '[$]';
                if (packageInfo.isHighValue) icons += '[H]';

                const rowNumberText = `${icons} ${i + 1}`;
                


                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(0, 0, 0);
                doc.text(rowNumberText, 6, currentY + 4);
                doc.text(packageInfo.trackingNumber, 16, currentY + 4);
                doc.text(recipientName, 37, currentY + 4);
                doc.text(recipientAddress, 97, currentY + 4);
                doc.text(payment, 157, currentY + 4);
                doc.text(commitDate, 169, currentY + 4);
                doc.text(commitTime, 187, currentY + 4);
                doc.text(recipientPhone, 201, currentY + 4);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text((i + 1).toString(), 9, currentY + 4);
            }

            currentY += rowHeight;
        }

        return currentY + 5;
    }

    async generatePDF(): Promise<{ blob: Blob; fileName: string }> {
        const doc = new jsPDF("l", "mm", "a4");
        try {
            const logoDataUrl = await this.loadPmyLog();
            let currentY = this.drawHeader(doc, logoDataUrl);
            currentY = this.drawLocationSection(doc, currentY);
            currentY = this.drawPackageSection(doc, currentY);
            const currentDate = new Date().toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            const fileName = `PMY_Salida_a_Ruta_${this.subsidiaryName}_${currentDate.replace(/\//g, "-")}.pdf`;
            return { blob: doc.output('blob'), fileName };
        } catch (error) {
            console.error("Error generating PDF:", error);
            throw error;
        }
    }
}

export const generateEnhancedFedExPDFPackageDispatch = async (
    drivers: Driver[],
    routes: Route[],
    vehicle: Vehicles,
    packages: PackageInfo[],
    subsidiaryName: string,
): Promise<{ blob: Blob; fileName: string }> => {
    const generator = new EnhancedFedExPDFGeneratorPackagDispatch(drivers, routes, vehicle, packages, subsidiaryName);
    return await generator.generatePDF();
};