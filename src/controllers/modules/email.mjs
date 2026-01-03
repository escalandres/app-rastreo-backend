import fs from 'fs';
import path from "path";
// import sendMail from './nodemailer.js';
import sendMailResend from './resend.mjs';
import { consoleLog } from './utils.mjs';

export const PLANTILLAS = {
    recover: {
        subject: "Recuperar cuenta",
        file: 'p.html'
    },
    notify: {
        subject: "Hay novedades en tu rastreador",
        file: 'tracker-notification.html'
    },
    delivery: {
        subject: "Hay novedades en tu rastreador",
        file: 'delivery-update.html'
    },
    trackerOn: {
        subject: "Rastreador encendido",
        file: 'tracker-on.html'
    },
    trackerActivated: {
        subject: "Rastreador activado",
        file: 'tracking-activated.html'
    },
    otp: {
        subject: "Código de verificación:",
        file: 'otp-code.html'
    },
    trackingGuideAdded: {
        subject: "Guía de rastreo agregada",
        file: 'tracking-guide-added.html'
    },
    trackingStarted: {
        subject: "Comenzando rastreo",
        file: 'tracking-started.html'
    }
}

export async function sendOtpEmail(email,otp) {
    try{
        const data = {
            otp: otp,
            email: email
        };
        let response = await buildEmail(PLANTILLAS.otp,data);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendNotifyEmail(data, statusInfo) {
    try{
        const hasStatusInfo = statusInfo && Object.keys(statusInfo).length > 0;
        const templateObj = hasStatusInfo ? PLANTILLAS.delivery : PLANTILLAS.notify;
        const allVariables = { ...data, ...(hasStatusInfo ? statusInfo : {}) };
        let response = await buildEmail(templateObj,allVariables);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendTrackerOn(data) {
    try{
        let response = await buildEmail(PLANTILLAS.trackerOn,data);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendTrackerActivated(data) {
    try{
        let response = await buildEmail(PLANTILLAS.trackerActivated,data);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendTrackingGuideAdded(data) {
    try{
        let response = await buildEmail(PLANTILLAS.trackingGuideAdded,data);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

export async function sendTrackingStarted(data) {
    try{
        let response = await buildEmail(PLANTILLAS.trackingStarted,data);
        return response;
    }catch(error){
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

async function buildEmail(templateToSend,data) {
    try{
        consoleLog("enviando correo de encendido");
        consoleLog("data", data);
        const templateObj = templateToSend;
        const templateFolder = EMAIL_TEMPLATES_PATH;
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
        let email = process.env.TO_EMAIL;
        let info = await sendMailResend(email,subject,template);
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