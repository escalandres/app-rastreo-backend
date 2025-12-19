import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function sendMailResend(to, subject, template) {
    try {
        // Validar API key
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY no está configurado');
        }

        console.log("Enviando correo a:", to);
        
        const { data, error } = await resend.emails.send({
            from: 'Tu App <onboarding@resend.dev>', // Email por defecto de Resend
            to: [to],
            subject: subject,
            html: template,
            // Opcional: agregar reply-to
            reply_to: process.env.USER_EMAIL,
        });

        if (error) {
            console.error('❌ Error de Resend:', error);
            return { success: false, error: error.message };
        }

        console.log("✅ Email enviado:", data.id);
        console.log("Email enviado:", data.id);
        return { success: true, message: data };
    } catch (error) {
        console.error('❌ Error al enviar el correo:', error);
        return { success: false, error: error.message };
    }
}