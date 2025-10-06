import express from 'express';

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