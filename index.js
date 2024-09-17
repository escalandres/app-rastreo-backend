//NPM modules - ECMAScript Modules
import path from 'path';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// import { fileURLToPath } from 'url';
// import { dirname } from 'path';

// -------------- My modules --------------
import userRoutes from './routes/user.js';
// import uploadRoutes from './routes/upload.js';
// import createRoutes from './routes/create.js';
// import fileRoutes from './routes/file.js';
import { checkCookie } from './controllers/modules/checkCookie.mjs';


// -------------- Variables modules --------------
const app = express();

// -------------- Variables Globales --------------
// Obtiene el directorio del archivo actual
// const __dirname = dirname(currentFilePath);
// global.__dirname = __dirname;
// global.VIEWS_PATH = path.join(__dirname, 'src', 'views');
// global.CONTROLLER_PATH = path.join(__dirname, 'controllers');
// global.MODULES_PATH = path.join(__dirname, 'controllers', 'modules');
// global.DRIVE_PATH = path.join(__dirname, 'drive');




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

app.get('/test', (req, res) => {
    res.send('Hola mundo');
});

app.use('/user', userRoutes);



app.listen(process.env.PORT, () => console.log(`App running on http://localhost:${process.env.PORT}`))










