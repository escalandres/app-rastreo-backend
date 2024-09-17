import {MongoClient} from 'mongodb';
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
    let dbResult = await getUser(email);
    // console.log(dbResult)
    if(dbResult.success){
      const username = dbResult.user.name;
      const otp = generarOTP();
      const timeStamp = generarTimestamp();
      const client = await connect()
      dbResult = await client.collection("otp").insertOne({otp: otp,email:email, timestamp: timeStamp});

      if (dbResult.acknowledged) {
        return { success: true, result: {otp: otp, name: username}, error: "" };
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

// Funciones auxiliares

function generarOTP() {
  const min = 1000; // El número mínimo de 4 dígitos (inclusive)
  const max = 9999; // El número máximo de 4 dígitos (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarTimestamp() {
  const duracionEnMilisegundos = 300000; // 5 minutos en milisegundos
  const ahora = Date.now(); // Obtiene la marca de tiempo actual.
  const timestampConDuracion = ahora + duracionEnMilisegundos;
  return timestampConDuracion;
}