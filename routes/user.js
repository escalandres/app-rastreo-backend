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

import { signup, login, logout, changeUserPassword, generateOTP, checkOTP, validateCheckToken, validateChangeToken, googleAuth, githubAuth } from '../controllers/user.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/auth/google', googleAuth);
router.post('/auth/github', githubAuth);
router.post('/logout', logout);
router.patch('/change-password', changeUserPassword);
router.post('/generate-otp', generateOTP);
router.post('/check-otp', checkOTP);

export default router;