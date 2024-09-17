import express from 'express';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
// Set up storage for uploaded files

// const currentFileURL = import.meta.url;
// // Convierte la URL del archivo en una ruta de sistema de archivos
// const currentFilePath = fileURLToPath(currentFileURL);
// // Obtiene el directorio del archivo actual
// const __dirname = dirname(currentFilePath);

import { signup, login, logout, changeUserPassword, generateOTP, checkOTP, validateCheckToken, validateChangeToken } from '../controllers/user.js';

const router = express.Router();

// router.get('/check-otp',(req,res)=>{
//     return res.sendFile(path.join(VIEWS_PATH,'otp.html'));
// })

router.get('/check-otp', validateCheckToken,(req,res)=>{
    return res.sendFile(path.join(VIEWS_PATH,'otp.html'));
})

router.get('/change-password', validateChangeToken, (req,res)=>{
    return res.sendFile(path.join(VIEWS_PATH,'change-password.html'));
})

// router.get('/change-password',  (req,res)=>{
//     return res.sendFile(path.join(VIEWS_PATH,'change.html'));
// })

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.patch('/change-password', changeUserPassword);
router.post('/generate-otp', generateOTP);
router.post('/check-otp', checkOTP);
// router.get('/')

export default router;