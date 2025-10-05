//NPM modules - ECMAScript Modules
import path from 'path';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// -------------- My modules --------------
import userRoutes from './routes/user.js';
import appRoutes from './routes/app.js';
import trackerRoutes from './routes/tracker.js';
import shipmentRoutes from './routes/shipment.js';
import sendMail from './controllers/modules/nodemailer.js';
import dotenv from 'dotenv';
// -------------- Variables modules --------------
const app = express();

dotenv.config();


// -------------- Variables Globales --------------
// Obtiene la URL del archivo actual
const currentFileURL = import.meta.url;
// Convierte la URL del archivo en una ruta de sistema de archivos
const currentFilePath = fileURLToPath(currentFileURL);
// Obtiene el directorio del archivo actual
const __dirname = dirname(currentFilePath);
global.__dirname = __dirname;
global.EMAIL_TEMPLATES_PATH = path.join(__dirname, 'src', 'templates', 'email_templates');
global.PDF_TEMPLATES_PATH = path.join(__dirname, 'src', 'templates', 'pdf_templates');
global.TEMP_PATH = path.join(__dirname, 'temp');

// -------------- settings --------------
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors());
app.use(cookieParser());

// -------------- Configuración de express-session  --------------
app.use(session({
    secret: process.env.KEY, // Cambia esto a una clave secreta fuerte en producción
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 15 * 60 * 1000, // 15 minutos (en milisegundos)
        secure: false,             // Solo se envía la cookie en conexiones seguras (HTTPS)
        httpOnly: true,           // La cookie solo es accesible por el servidor (no por JavaScript en el navegador)
        sameSite: 'strict',       // Controla cómo se envía la cookie en las solicitudes del mismo sitio
        path: '/',                // Ruta base donde se aplica la cookie
        domain: 'localhost:5322',    // Dominio para el que se aplicará la cookie
    },
}));

// Aplicar los middlewares en orden
// app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('App rastreo de paquetes');
});


app.get('/test', (req, res) => {
    res.send('Hola mundo');
});

app.use('/user', userRoutes);
app.use('/app', appRoutes);

app.use('/api/tracker', trackerRoutes);
app.use('/api/shipment', shipmentRoutes);

app.post('/sendmail', async (req, res) => {
    const { to, subject, text } = req.body;
    try {
        let info = await sendMail(to, subject, text);
        res.status(200).send(`Email sent: ${info}`);
    } catch (error) {
        res.status(500).send("Error sending email");
    }
});

app.listen(process.env.PORT, () => console.log(`App running on http://localhost:${process.env.PORT}`))










