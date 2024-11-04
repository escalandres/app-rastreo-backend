import {MongoClient} from 'mongodb';
import crypto from 'crypto';


const uri = process.env.DATABASE_URL;
// const client = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});
const client = new MongoClient(uri, {});

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    const db = client.db('app-rastreo');
    return db;
  } catch (err) {
    console.error('Error connecting to MongoDB Atlas:', err);
  }
}

async function disconnect() {
  try {
    await client.close();
    console.log('Disconnected from MongoDB Atlas');
  } catch (err) {
    console.error('Error disconnecting from MongoDB Atlas:', err);
  }
}

export async function getUser(email) {
  try {
    const client = await connect()
    const usersCollection = client.collection('users');
    const dbResult = await usersCollection.findOne({email: email});

    if (dbResult) {
      console.log("Usuario encontrado:", dbResult);
      await usersCollection.updateOne({email: email}, {$set: {last_login: new Date()}});
      return {success: true, user: dbResult, error: "" };
    } else {
      return {success: false, user: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al buscar el usuario. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    disconnect();
  }
}

export async function registerNewUser(user) {
  try {
    const client = await connect()
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
    console.error('Ocurrio un error:', error);
    return {success: false, message: error};
  } finally {
    disconnect();
  }
}

export async function registrarOTP(email) {
  try {
    const client = await connect();
    let dbResult = await client.collection("users").findOne({email: email});
    console.log(dbResult)
    if(dbResult){
      const otp = generarOTP();
      const timeStamp = generarTimestamp();
      console.log("otp", otp);
      console.log("timeStamp", timeStamp);
      console.log("email", email);
      
      console.log("------conectado----------");
      dbResult = await client.collection("otp").insertOne({otp: otp,email:email, timestamp: timeStamp});

      if (dbResult.acknowledged) {
        return { success: true, result: {otp: otp, email: email}, error: "" };
      } else {
        return { success: false, result: "", error: "No se pudo crear el usuario" }
      }
    }else return { success: false, result: "", error: "No existe el usuario" }
  } catch (error) {
    console.error('Ocurrio un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    disconnect();
  }
}

export async function getOTP(email) {
  console.log('getOTP')
  try {
    let otp = ""
    const client = await connect()
    const dbResult = await client.collection("otp")
    .find({ email: email })
    .sort({ "timestamp": -1 })
    .limit(1)
    .toArray();

    if (dbResult.length > 0) {
      console.log('Documento más reciente:', dbResult[0]);
      otp = dbResult[0];
    } else {
      console.log('La colección está vacía.');
    }
    console.log(dbResult)
    if (otp !== "") {      
      return { success: true, result: otp, error: "" };
    } else {
      return { success: false, result: {}, error: "Categoria no encontrado" }
    }
  } catch (error) {
    console.error('Ocurrio un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    disconnect();
  }
}

export async function changePassword(email,password) {
  try {
    const client = await connect()
    const usersCollection = client.collection('users');
    const dbResult = await usersCollection.updateOne({email: email}, {$set: {password: password}});

    console.log(dbResult)
    if (dbResult.acknowledged) {
      return { success: true, result: "Articulo modificado!", error: "" };
    } else {
      return { success: false, result: "", error: "No se pudo modificar el articulo" }
    }
  } catch (error) {
    console.error('Ocurrio un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    disconnect();
  }
}

export async function guardarCoordenadas(coordenadas) {
  try {
    const client = await connect()
    const collection = client.collection('bitacora_envios');

    const dbResult = await collection.insertOne(coordenadas);
    if (dbResult.acknowledged) {
      return { success: true, result: "Registro guardado!", error: "" };
    } else {
      return { success: false, result: "", error: "No se pudo guardar el regsitro" }
    }
  } catch (error) {
    console.error('Ocurrio un error:', error);
    return {success: false, message: error};
  } finally {
    disconnect();
  }
}

export async function authGoogle(oauth) {
  try {

    console.log("oauth",oauth)

    const client = await connect()
    const collection = client.collection('users');
    const dbResult = await collection.findOne({email: oauth.email});

    if (dbResult) {
      // console.log("Usuario encontrado:", dbResult);
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
    disconnect();
  }

}

export async function authGithub(oauth) {
  try {
    const client = await connect()
    const collection = client.collection('users');
    const dbResult = await collection.findOne({email: oauth.email});

    if (dbResult) {
      // console.log("Usuario encontrado:", dbResult);
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
    disconnect();
  }

}

// Funciones auxiliares

function generarOTP() {
  const min = 100000; // El número mínimo de 6 dígitos (inclusive)
  const max = 999999; // El número máximo de 6 dígitos (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarTimestamp() {
  const duracionEnMilisegundos = 1800000; // 30 minutos en milisegundos
  const ahora = Date.now(); // Obtiene la marca de tiempo actual.
  const timestampConDuracion = ahora + duracionEnMilisegundos;
  return timestampConDuracion;
}