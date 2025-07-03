import fs from 'fs';
import path from "path";
import sendMail from './nodemailer.js';
import { consoleLog } from './utils.mjs';

export const PLANTILLAS = {
    recover: {
        subject: "Recuperar cuenta",
        file: 'p.html'
    },
    notify: {
        subject: "Hay novedades en tu cuenta",
        file: 'notify.html'
    },
    encendido: {
        subject: "Rastreador encendido",
        file: 'encendido.html'
    },
    otp: {
        subject: "Código de verificación:",
        file: 'otp.html'
    }
}

export async function sendOtpEmail(email,otp) {
    try{
        const templateFolder = process.env.NODE_ENV === 'production' ? PROD_EMAIL_TEMPLATES_PATH : DEV_EMAIL_TEMPLATES_PATH;
        const templatePath = path.join(templateFolder, `${PLANTILLAS.otp.file}`);
        let template = fs.readFileSync(templatePath, 'utf8');
        consoleLog("template");
        const variables = {
            otp: otp,
            email: email
        };
        // Reemplaza las variables en la plantilla
        Object.keys(variables).forEach(key => {
            consoleLog("key", key);
            const regex = new RegExp(`{${key}}`, 'g');
            template = template.replace(regex, variables[key]);
        });
    
        let subject = `${PLANTILLAS.otp.subject} ${otp}`;
        let info = await sendMail(email,subject,template);
        return {success: true, message: info};
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendNotifyEmail(data) {
    try{
        consoleLog("enviando correo de notificacion");
        consoleLog("data", data);
        const templateFolder = process.env.NODE_ENV === 'production' ? PROD_EMAIL_TEMPLATES_PATH : DEV_EMAIL_TEMPLATES_PATH;
        const templatePath = path.join(templateFolder, `${PLANTILLAS.notify.file}`);
        let template = fs.readFileSync(templatePath, 'utf8');
        consoleLog("template");
        const variables = data;
        consoleLog("variables", variables);
        // Reemplaza las variables en la plantilla
        Object.keys(variables).forEach(key => {
            consoleLog("key", key);
            const regex = new RegExp(`{${key}}`, 'g');
            template = template.replace(regex, variables[key]);
        });
    
        let subject = `${PLANTILLAS.notify.subject} ${variables.tracker}`;
        let email = "andres.escala.344@gmail.com";
        let info = await sendMail(email,subject,template);
        return {success: true, message: info};
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendEncendido(data) {
    try{
        consoleLog("enviando correo de encendido");
        consoleLog("data", data);
        const templateObj = PLANTILLAS.encendido;
        const templateFolder = process.env.NODE_ENV === 'production' ? PROD_EMAIL_TEMPLATES_PATH : DEV_EMAIL_TEMPLATES_PATH;
        const templatePath = path.join(templateFolder, `${templateObj.file}`);
        let template = fs.readFileSync(templatePath, 'utf8');
        consoleLog("template");
        const variables = data;
        consoleLog("variables", variables);
        // Reemplaza las variables en la plantilla
        Object.keys(variables).forEach(key => {
            consoleLog("key", key);
            const regex = new RegExp(`{${key}}`, 'g');
            template = template.replace(regex, variables[key]);
        });

        let subject = `${templateObj.subject} ${variables.tracker}`;
        let email = "andres.escala.344@gmail.com";
        let info = await sendMail(email,subject,template);
        return {success: true, message: info};
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export function createEmail(plantilla, name, code) {
    const source = fs.readFileSync(path.join(__dirname,'plantillas',plantilla.file), 'utf8');
    // Define los valores a reemplazar en la plantilla
    const replacements = {
        name: name,
        code: code,
    };
    consoleLog(name)
    let html = source.replace('{name}',name)
    html = html.replace('{code}',code)
    return { subject: plantilla.subject, html: html };
}