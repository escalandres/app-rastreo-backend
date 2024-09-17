import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
// Set up storage for uploaded files

const currentFileURL = import.meta.url;
// Convierte la URL del archivo en una ruta de sistema de archivos
const currentFilePath = fileURLToPath(currentFileURL);
// Obtiene el directorio del archivo actual
const __dirname = dirname(currentFilePath);

export var PLANTILLAS = {
    recover: {
        subject: "Recuperar cuenta",
        file: 'p.html'
    },
}

export function createEmail(plantilla, name, code) {
    const source = fs.readFileSync(path.join(__dirname,'plantillas',plantilla.file), 'utf8');
    // Define los valores a reemplazar en la plantilla
    const replacements = {
        name: name,
        code: code,
    };
    console.log(name)
    let html = source.replace('{name}',name)
    html = html.replace('{code}',code)
    return { subject: plantilla.subject, html: html };
}