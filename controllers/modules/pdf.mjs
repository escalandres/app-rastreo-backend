import ejs from "ejs";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { consoleLog, translateStatus, colorStatus, translateStatusCode, convertDateToReport, generateDate, processLocation } from "./utils.mjs";

export async function generarPDF() {
    try {
        const datos = [
            { id: 1, nombre: "Juan Pérez", email: "juan.perez@example.com" },
            { id: 2, nombre: "Ana López", email: "ana.lopez@example.com" },
            { id: 3, nombre: "Carlos García", email: "carlos.garcia@example.com" }
        ];
        const templateFolder = EMAIL_TEMPLATES_PATH;
        const templatePath = path.join(templateFolder, `${PLANTILLAS.notify.file}`);
        const template = await fs.readFile(path.join(templatePath, "plantilla.ejs"), "utf-8");
        const html = ejs.render(template, { datos });

        const browser = await puppeteer.launch({
            headless: process.env.NODE_ENV === "production",
            executablePath: process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath()
        });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();
        await fs.writeFile(path.join(PDF_PATH, "reporte.pdf"), pdfBuffer);
        consoleLog("PDF generado correctamente");
        return pdfBuffer;
    } catch (error) {
        console.error("Error generando el PDF:", error);
        throw error;
    }
};

export async function generarReporteSeguimiento(data) {
    try {

        // datasource
        const template = await fs.readFile(path.join(PDF_TEMPLATES_PATH, "reporte_seguimiento.ejs"), "utf-8");
        const datasource = processDataSource(data);
        consoleLog("Datasource:", datasource); // Verifica el contenido de datasource
        const html = ejs.render(template, { datasource });

        // const browser = await puppeteer.launch({
        //     headless: process.env.NODE_ENV === "production"
        //     ? true : false,
        //     executablePath: process.env.NODE_ENV === "production"
        //     ? process.env.PUPPETEER_EXECUTABLE_PATH
        //     : puppeteer.executablePath(),
        //     args: [
        //         '--disable-infobars',
        //         '--no-sandbox',
        //         '--disable-setuid-sandbox',
        //         '--disable-dev-shm-usage',
        //         '--disable-blink-features=AutomationControlled'
        //     ]
        // });
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium',
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-dev-tools',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });
        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: "A4" });

        await browser.close();
        await fs.writeFile(path.join(PDF_PATH, "reporte_seguimiento.pdf"), pdfBuffer);
        const pdf = {
            extension: "pdf",
            nombre: `reporte_seguimiento_${datasource.id}_${new Date().toISOString().slice(0, 10)}.pdf`,
            mimetype: "application/pdf",
            buffer: pdfBuffer,
        }
        consoleLog("PDF generado correctamente");
        return pdf;
    } catch (error) {
        console.error("Error generando el PDF:", error);
        throw error;
    }
};

function processDataSource(datasource) {
    consoleLog("Datasource original:", datasource); // Verifica el contenido original
    datasource.generate_date = generateDate();
    datasource.start_date = generateDate(datasource.start_date);
    datasource.delivery_date = generateDate(datasource.delivery_date);
    datasource.shipment_status = datasource.shipment_status.map(item => ({
        ...item, // conserva los campos originales
        translated_status: translateStatus(item.status_code),
        status_color: colorStatus(item.status_code),
        formatted_timestamp: convertDateToReport(item.timestamp)
    }));
    datasource.shipment_status.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    datasource.locations = datasource.locations.map(item => ({
        ...item, // conserva los campos originales
        location: processLocation(item.isCellTower, item.radius),
        formatted_timestamp: convertDateToReport(item.date)
    }));
    datasource.locations.sort((a, b) => new Date(b.date) - new Date(a.date));
    return datasource;
}
