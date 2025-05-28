import fs from 'fs';
import path from "path";
import sendMail from './nodemailer.js';


export const PLANTILLAS = {
    recover: {
        subject: "Recuperar cuenta",
        file: 'p.html'
    },
    notify: {
        subject: "Hay novedades en tu cuenta",
        file: 'notify.html'
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
        console.log("template");
        const variables = {
            otp: otp,
            email: email
        };
        // Reemplaza las variables en la plantilla
        Object.keys(variables).forEach(key => {
            console.log("key", key);
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
        console.log("enviando correo de notificacion");
        console.log("data", data);
        const templateFolder = process.env.NODE_ENV === 'production' ? PROD_EMAIL_TEMPLATES_PATH : DEV_EMAIL_TEMPLATES_PATH;
        const templatePath = path.join(templateFolder, `${PLANTILLAS.notify.file}`);
        let template = fs.readFileSync(templatePath, 'utf8');
        console.log("template");
        const variables = data;
        console.log("variables", variables);
        // Reemplaza las variables en la plantilla
        Object.keys(variables).forEach(key => {
            console.log("key", key);
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