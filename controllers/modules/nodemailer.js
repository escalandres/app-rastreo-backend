import nodemailer from "nodemailer";

export default async function sendMail(to, subject, template) {
    try {
        console.log("📧 Enviando correo a:", to);
        console.log("USER_EMAIL:", process.env.USER_EMAIL ? "true" : "no");
        console.log("PASS_EMAIL:", process.env.PASS_EMAIL ? "true" : "no");
        
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.PASS_EMAIL,
            },
            connectionTimeout: 30000, // 30 segundos
            tls: {
                ciphers: 'SSLv3'
            }
        });

        // Verificar conexión
        await transporter.verify();
        console.log("✅ Conexión SMTP verificada");

        const mailOptions = {
            from: `"Tu App" <${process.env.USER_EMAIL}>`,
            to: to,
            subject: subject,
            html: template,
        };
    
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email enviado:", info.messageId);
        return {success: true, message: info};
    } catch (error) {
        console.error('❌ Error al enviar el correo:', error.message);
        return {success: false, error: error.message};
    }
}

