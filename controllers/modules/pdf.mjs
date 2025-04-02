import ejs from "ejs";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

export async function generarPDF() {
    try {
        const datos = [
            { id: 1, nombre: "Juan Pérez", email: "juan.perez@example.com" },
            { id: 2, nombre: "Ana López", email: "ana.lopez@example.com" },
            { id: 3, nombre: "Carlos García", email: "carlos.garcia@example.com" }
        ];
        
        const template = await fs.readFile(path.join(PDF_TEMPLATES_PATH, "plantilla.ejs"), "utf-8");
        const html = ejs.render(template, { datos });

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();
        await fs.writeFile(path.join(PDF_PATH, "reporte.pdf"), pdfBuffer);
        console.log("PDF generado correctamente");
        return pdfBuffer;
    } catch (error) {
        console.error("Error generando el PDF:", error);
        throw error;
    }
};

export async function generarReporteSeguimiento(datasource) {
    try {

        console.log("Datasource:", datasource); // Verifica el contenido de datasource
        const template = await fs.readFile(path.join(PDF_TEMPLATES_PATH, "reporte_seguimiento.ejs"), "utf-8");
        const html = ejs.render(template, { datasource });

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();
        await fs.writeFile(path.join(PDF_PATH, "reporte_seguimiento.pdf"), pdfBuffer);
        console.log("PDF generado correctamente");
        return pdfBuffer;
    } catch (error) {
        console.error("Error generando el PDF:", error);
        throw error;
    }
};
