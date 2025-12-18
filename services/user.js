import { dbClient } from '../config/mongodb.js';
import { consoleLog } from '../controllers/modules/utils.mjs';

export async function getUser(email) {
    let client = null;
    try {
        client = await dbClient.connect();
        const usersCollection = client.collection('users');
        const dbResult = await usersCollection.findOne({email: email});

        if (dbResult) {
        consoleLog("Usuario encontrado:", dbResult);
        await usersCollection.updateOne({email: email}, {$set: {last_login: new Date()}});
        return {success: true, user: dbResult, error: "" };
        } else {
        return {success: false, user: {}, error: "Usuario no encontrado"}
        }
    } catch (error) {
        console.error('Error al buscar el usuario. ',error);
        return {success: false, user: {}, error: error}
    } finally {
        if (client) {
            await dbClient.disconnect();
        }
    }
}

export async function registerNewUser(user) {
    let client = null;
    try {
        client = await dbClient.connect();
        const usersCollection = client.collection('users');

        // Crear índices únicos en email y userId
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        await usersCollection.createIndex({ id: 1 }, { unique: true });

        const dbResult = await usersCollection.insertOne(user);
        if (dbResult.acknowledged) {
        return { success: true, result: "Usuario creado!", error: "" };
        } else {
        return { success: false, result: "", error: "No se pudo crear el usuario" }
        }
    } catch (error) {
        console.error('Ocurrió un error:', error);
        return {success: false, message: error};
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function registrarOTP(email) {
    let client = null;
    try {
        client = await dbClient.connect();
        let dbResult = await client.collection("users").findOne({email: email});
        consoleLog(dbResult)
        if(dbResult){
        const otp = generarOTP();
        const timeStamp = generateTimestamp();
        consoleLog("otp", otp);
        consoleLog("timeStamp", timeStamp);
        consoleLog("email", email);
        
        consoleLog("------conectado----------");
        dbResult = await client.collection("otp").insertOne({otp: otp,email:email, timestamp: timeStamp});

        if (dbResult.acknowledged) {
            return { success: true, result: {otp: otp, email: email}, error: "" };
        } else {
            return { success: false, result: "", error: "No se pudo crear el usuario" }
        }
        }else return { success: false, result: "", error: "No existe el usuario" }
    } catch (error) {
        console.error('Ocurrió un error:', error);
        return { success: false, user: {}, error: error }
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function getOTP(email) {
    consoleLog('getOTP')
    let client = null;
    try {
        let otp = ""
        client = await dbClient.connect();
        const dbResult = await client.collection("otp")
        .find({ email: email })
        .sort({ "timestamp": -1 })
        .limit(1)
        .toArray();

        if (dbResult.length > 0) {
        consoleLog('Documento más reciente:', dbResult[0]);
        otp = dbResult[0];
        } else {
        consoleLog('La colección está vacía.');
        }
        consoleLog(dbResult)
        if (otp !== "") {      
        return { success: true, result: otp, error: "" };
        } else {
        return { success: false, result: {}, error: "Categoría no encontrado" }
        }
    } catch (error) {
        console.error('Ocurrió un error:', error);
        return { success: false, user: {}, error: error }
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function changePassword(email,password) {
    let client = null;
    try {
        client = await dbClient.connect();
        const usersCollection = client.collection('users');
        const dbResult = await usersCollection.updateOne({email: email}, {$set: {password: password}});

        consoleLog(dbResult)
        if (dbResult.acknowledged) {
        return { success: true, result: "Articulo modificado!", error: "" };
        } else {
        return { success: false, result: "", error: "No se pudo modificar el articulo" }
        }
    } catch (error) {
        console.error('Ocurrió un error:', error);
        return { success: false, user: {}, error: error }
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function guardarCoordenadas(coordenadas) {
    let client = null;
    try {
        client = await dbClient.connect();
        const collection = client.collection('bitacora_envios');

        const dbResult = await collection.insertOne(coordenadas);
        if (dbResult.acknowledged) {
        return { success: true, result: "Registro guardado!", error: "" };
        } else {
        return { success: false, result: "", error: "No se pudo guardar el registro" }
        }
    } catch (error) {
        console.error('Ocurrió un error:', error);
        return {success: false, message: error};
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function authGoogle(oauth) {
    let client = null;
    try {
        client = await dbClient.connect();
        const collection = client.collection('users');
        const dbResult = await collection.findOne({email: oauth.email});

        if (dbResult) {
        // consoleLog("Usuario encontrado:", dbResult);
        await collection.updateOne({email: oauth.email}, {$set: {last_login: new Date()}});
        return { success: true, user: dbResult, error: "" };
        } else {
        const userID = crypto.randomBytes(16).toString('hex');
        const currentDate = new Date();
        const provider = "https://accounts.google.com"
        const user = {id: userID, email: oauth.email, name: oauth.name,given_name: oauth.given_name, lastname: oauth.family_name,
            oauth_provider: provider, oauth_user_id: oauth.sub, email_verified: oauth.email_verified, profile_picture: oauth.picture,
            created_date: currentDate, last_login: currentDate };
        // Crear índices únicos en email y userId
            await collection.createIndex({ email: 1 }, { unique: true });
            await collection.createIndex({ id: 1 }, { unique: true });

            const dbResult = await collection.insertOne(user);
            if (dbResult.acknowledged) {
            return { success: true, user: user, error: "" };
            } else {
            return { success: false, user: {}, error: "No se pudo crear el usuario" }
            }
        }
    } catch (error) {
        console.error('Error al buscar el usuario. ',error);
        return { success: false, user: {}, error: error }
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function authGithub(oauth) {
    let client = null;
    try {
        client = await dbClient.connect();
        const collection = client.collection('users');
        const dbResult = await collection.findOne({email: oauth.email});

        if (dbResult) {
        // consoleLog("Usuario encontrado:", dbResult);
        await collection.updateOne({email: oauth.email}, {$set: {last_login: new Date()}});
        return { success: true, user: dbResult, error: "" };
        } else {
        const userID = crypto.randomBytes(16).toString('hex');
        const currentDate = new Date();
        const provider = "https://api.github.com"
        const user = {id: userID, email: oauth.email, name: oauth.name, oauth_provider: provider, 
            oauth_user_id: oauth.id, email_verified: true, profile_picture: oauth.avatar_url,
            created_date: currentDate, last_login: currentDate};
        // Crear índices únicos en email y userId
            await collection.createIndex({ email: 1 }, { unique: true });
            await collection.createIndex({ id: 1 }, { unique: true });

            const dbResult = await collection.insertOne(user);
            if (dbResult.acknowledged) {
            return { success: true, user: user, error: "" };
            } else {
            return { success: false, user: {}, error: "No se pudo crear el usuario" }
            }
        }
    } catch (error) {
        console.error('Error al buscar el usuario. ',error);
        return { success: false, user: {}, error: error }
    } finally {
        if (client) {
        await dbClient.disconnect();
        }
    }
}

export async function getUserCellphone(email) {
    let client = null;
    try {
        client = await dbClient.dbClient.connect();
        const usersCollection = client.collection('users');
        const dbResult = await usersCollection.findOne(
            {email: email},
            { projection: { cellphone: 1, _id: 0 } }
        );

        if (dbResult) {
        consoleLog("Usuario encontrado:", dbResult);
        
        return {success: true, result: dbResult, error: "" };
        } else {
        return {success: false, result: {}, error: "Usuario no encontrado"}
        }
    } catch (error) {
        console.error('Error al buscar el usuario. ',error);
        return {success: false, result: {}, error: error}
    } finally {
        if (client) {
            await dbClient.disconnect();
        }
    }
}