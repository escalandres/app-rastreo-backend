import { getUser, registerNewUser, changePassword, getOTP, registrarOTP } from "./modules/database.mjs";
import { sendRecoverEmail } from "./modules/resend.mjs";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function login(req, res){
    try {
        const { email, password } = req.body;
        const result = await getUser(email)

        // console.log(result)

        if(!result.success){
            return res.status(404).json({success: false, message: "The user does not exist"})
        }
        if(!bcrypt.compareSync(password, result.user.password)) {
            return res.status(404).json({success: false, message: "The password is invalid"})
        }
        // Agregar una cookie con JWT para autenticar a los usuarios   
        const token = jwt.sign({ user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            lastname: result.user.lastname
        }}, process.env.KEY, { expiresIn: '1m' });
        // res.cookie('AuthToken', token, { maxAge: 3 * 24 * 60 * 60 * 1000 });
        //req.session.user = { id: result.user.id, email: result.user.email };
        return res.status(200).json({ success: true, token: token });
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(401).json({ success: false });
    }
}

// export async function login(req, res){
//     try {
//         const { email, password } = req.body;
//         const result = await getUser(email)
//         if(!result.success){
//             return res.status(404).json({success: false, message: "The user does not exist"})
//         }
//         if(!bcrypt.compareSync(password, result.user.password)) {
//             return res.status(404).json({success: false, message: "The password is invalid"})
//         }
//         // Agregar una cookie con JWT para autenticar a los usuarios   
//         const token = jwt.sign({ user: result.user }, process.env.KEY, { expiresIn: '1h' });
//         res.cookie('AuthToken', token, { maxAge: 3 * 24 * 60 * 60 * 1000 });
//         //req.session.user = { id: result.user.id, email: result.user.email };
//         return res.status(200).json({ success: true });
//     } catch (error) {
//         console.error('Ocurrio un error:',error);
//         // Enviar respuesta JSON indicando fallo
//         res.status(401).json({ success: false });
//     }
// }

export async function signup(req,res){
    try {
        const { email, password, name, lastname } = req.body;
        const userID = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        const response = await registerNewUser({id: userID, email: email, name: name, lastname: lastname, password: hashedPassword})
        if(!response.success){
            return res.status(401).json({success: false, message: "Error al crear su cuenta de usuario. Inténtelo nuevamente"})
        }
        // Agregar una cookie con JWT para autenticar a los usuarios
        const token = jwt.sign({ user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            lastname: result.user.lastname
        }}, process.env.KEY, { expiresIn: '1m' });
        //req.session.user = {id: userID, email: email}
        res.status(200).json({success: true, token: token})
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(401).json({ success: false });
    }
}

export async function logout(req,res){
    // Destruir la sesión y redirigir a la página de inicio de sesión
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al destruir la sesión:', err);
            return res.status(500).json({success: false, message: "Ha ocurrido un error con su petición. Inténtelo nuevamente"})
        }
        res.clearCookie('AuthToken');
        return res.status(200).json({success: true})
    });
}

export async function changeUserPassword(req,res){
    try {
        const { password, email } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const response = await changePassword(email, hashedPassword)

        if (!response.success) {
            return res.status(401).json({ success: false, message: "No se pudo actualizar la contraseña" })
        }
        return res.status(200).json({ success: true })
    } catch (error) {
        console.error(error);
        // Enviar respuesta JSON indicando fallo
        res.status(401).json({ success: false });
    }
}

export async function generateOTP(req,res){
    try {
        const email = req.body.email;
        const response = await registrarOTP(email)
        if (!response.success) return res.status(401).json({ success: false, messageCode: "Error al crear su cuenta de usuario. Inténtelo nuevamente" });
        const token = jwt.sign({ email: email }, process.env.KEY, { expiresIn: '10m' });
        res.cookie('OtpToken', token, { maxAge: 10 * 60 * 1000 });
        const respuesta = await sendRecoverEmail(email,response.result.name,response.result.otp)
        if (!respuesta.success) return res.status(401).json({ success: false, message: "Error al crear su cuenta de usuario. Inténtelo nuevamente" })
        
        return res.status(200).json({ success: true })
    } catch (error) {
        console.error(error);
      // Enviar respuesta JSON indicando fallo
        res.status(401).json({ success: false });
    }
}

export async function checkOTP(req,res){
    try {
        const otp = req.body.otp;
        const token = req.cookies.AuthToken;
        const decoded = jwt.verify(token, process.env.KEY);
        const response = await getOTP(decoded.email)
        if (!response.success) return res.status(401).json({ success: false, message: "Error al crear su cuenta de usuario. Inténtelo nuevamente" })

        if (!Date.now() < response.timestamp) return res.status(401).json({ success: false, message: "El código de seguridad ha expirado. Inténtelo nuevamente" })
        if (otp !== response.result.otp.toString()) return res.status(401).json({ success: false, message: "El código de seguridad ingresado es incorrecto" })
        const token2 = jwt.sign({ email: email, otp: otp }, process.env.KEY, { expiresIn: '5m' });
        res.cookie('ChangeToken', token2, {maxAge: 5 * 60 * 1000});
        return res.redirect('/change-password')
    } catch (error) {
        console.error(error);
        // Enviar respuesta JSON indicando fallo
        res.status(401).json({ success: false });
    }
}

// Middleware para verificar el token en la cookie
export function validateCheckToken(req, res, next) {
    const token = req.cookies.CheckToken; // Lee el token de la cookie llamada 'token'
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.KEY);
            // req.usuario = decoded; // Almacena la información del usuario en 'req' para su posterior uso
            next(); // El token es válido, permite que la solicitud continúe
        } catch (error) {
            return res.redirect('/error');
            
        }
    } else {
        return res.redirect('/error');
    }
}

export function validateChangeToken(req, res, next) {
    const token = req.cookies.ChangeToken; // Lee el token de la cookie llamada 'token'
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.KEY);
            // req.usuario = decoded; // Almacena la información del usuario en 'req' para su posterior uso
            next(); // El token es válido, permite que la solicitud continúe
        } catch (error) {
            return res.redirect('/error');
            
        }
    } else {
        return res.redirect('/error');
    }
}