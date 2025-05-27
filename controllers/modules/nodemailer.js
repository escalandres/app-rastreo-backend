import nodemailer from "nodemailer";
import fs from 'fs';
import path from "path";

export default async function sendMail(to,subject,template) {
    try {
        console.log("Enviando correo");
        // Create a transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.PASS_EMAIL,
            },
        });
        // const templateName = 'otp';
        // const templatePath = path.join(TEMPLATES_PATH, `${templateName}.html`);
        // let template = fs.readFileSync(templatePath, 'utf8');
        // console.log("template");
        // const variables = {
        //     otp: "123456",
        //     email: "user@example.com"
        // };
        // console.log("variables", variables);
        // // Reemplaza las variables en la plantilla
        // Object.keys(variables).forEach(key => {
        //     console.log("key", key);
        //     const regex = new RegExp(`{${key}}`, 'g');
        //     template = template.replace(regex, variables[key]);
        // });
        // console.log("variables en templates");
        // Set up email options
        let mailOptions = {
            from: process.env.USER_EMAIL,
            to: to,
            subject: subject,
            html: template,
        };

    
        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return {success: true, message: info};
    } catch (error) {
        console.error('Error al enviar el correo. ',error);
        return {success: false, error: error}
    }
}

