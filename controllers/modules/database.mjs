import { MongoClient } from 'mongodb';
import {generarOTP, generateTimestamp, isEmptyObj, formatDateToTimestamp} from './utils.mjs';
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

// ----------------------- User Controller -----------------------

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
    if (client) {
      await disconnect();
    }
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
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function registrarOTP(email) {
  try {
    const client = await connect();
    let dbResult = await client.collection("users").findOne({email: email});
    console.log(dbResult)
    if(dbResult){
      const otp = generarOTP();
      const timeStamp = generateTimestamp();
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
    console.error('Ocurrió un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    if (client) {
      await disconnect();
    }
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
      return { success: false, result: {}, error: "Categoría no encontrado" }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    if (client) {
      await disconnect();
    }
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
    console.error('Ocurrió un error:', error);
    return { success: false, user: {}, error: error }
  } finally {
    if (client) {
      await disconnect();
    }
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
      return { success: false, result: "", error: "No se pudo guardar el registro" }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function authGoogle(oauth) {
  try {

    // console.log("oauth",oauth)

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
    if (client) {
      await disconnect();
    }
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
    if (client) {
      await disconnect();
    }
  }

}

// ----------------------- Tracker Controller -----------------------







// ----------------------- Shipment Controller -----------------------
export async function consultaEmpresasPaqueteria() {
  try {
    const client = await connect()
    const collection = client.collection('shipment_companies');
    const dbResult = await collection.find({}).toArray();

    if (dbResult) {
      console.log("Documentos obtenidos:", dbResult);
      return {success: true, catalogo: dbResult, error: "" };
    } else {
      return {success: false, catalogo: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, catalogo: {}, error: error}
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function getUserContainers(userID) {
  try {
    const client = await connect()
    const collection = client.collection('trackers');
    const dbResult = await collection.find({ user_id: userID}).toArray();
    if (dbResult) {
      console.log("Documentos obtenidos:", dbResult);
      return {success: true, results: dbResult, error: "" };
    } else {
      return {success: false, results: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function getAppInfo(userID) {
  try {
    const client = await connect();
    const companiesCollection = client.collection('shipment_companies');
    const trackerCollection = client.collection('trackers');

    const companies = await companiesCollection.find({}).toArray();
    const trackers = await trackerCollection.find({ user_id: userID}).toArray();
    const response = {
      shipment_companies: companies ?? {},
      user_containers: trackers ?? {}
    }
    return {success: true, results: response, error: "" };
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, results: {}, error: error}
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function registerNewShipment(shipment) {
  try {
    const client = await connect()
    const shipmentCollection = client.collection('shipments');
    const shipmentID = generarOTP();
    console.log("shipmentID", shipmentID);
    shipment.id = shipmentID;
    console.log("shipment", shipment);
    // Crear índices únicos en email y userId
    await shipmentCollection.createIndex({ id: 1 }, { unique: true });

    const dbResult = await shipmentCollection.insertOne(shipment);
    if (dbResult.acknowledged) {
      return { success: true, result: "Envío registrado!", error: "" };
    } else {
      return { success: false, result: "", error: "No se pudo registrar el envío" }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function updateShipment(shipmentID, newLocation, newStatus) {
  try {
    const client = await connect()
    const shipmentCollection = client.collection('shipments');
    console.log("shipmentID", shipmentID);
    console.log("newLocation", newLocation);
    console.log("newStatus", newStatus);
    if(!isEmptyObj(newLocation)) await shipmentCollection.updateOne({id: shipmentID}, {$push: { locations: newLocation }});
    if(!isEmptyObj(newStatus)) await shipmentCollection.updateOne({id: shipmentID}, {$push: { shipment_status: newStatus}});
    if(newStatus.status_code === "delivered"){
      let newDeliveryDate = new Date();
      newDeliveryDate = formatDateToTimestamp(newDeliveryDate);
      await shipmentCollection.updateOne({id: shipmentID}, {$set: { delivery_date: newDeliveryDate}});
    }
    return {success: true, message: 'Guardado exitoso'};
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function linkTracker(tracker) {
  try {
    const client = await connect()
    const collection = client.collection('trackers');

    // Verifica si el tracker ya está vinculado a otro usuario 
    const existingTracker = await collection.findOne({ id: tracker.id });

    if(existingTracker){
      if (existingTracker.user_id === tracker.user_id) { 
        return { success: false, error: "El tracker ya está vinculado a este usuario." }
      } 
      else { 
        return { success: false, error: "El tracker ya está vinculado a otro usuario." }
      }
    }else{
      await collection.createIndex({ id: 1 }, { unique: true });

      const dbResult = await collection.insertOne(tracker);
      if (dbResult.acknowledged) {
        return { success: true, result: "¡Se ha vinculado el tracker a su cuenta!", error: "" };
      } else {
        return { success: false, result: "", error: "Ocurrió un error al vincular el tracker. Inténtelo nuevamente!" }
      }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function getContainerShipments(containerID) {
  try {
    const client = await connect()
    const collection = client.collection('shipments');
    const dbResult = await collection.find({ container_id: parseInt(containerID)}).toArray();
    if (dbResult) {
      console.log("Documentos obtenidos:", dbResult);
      return {success: true, results: dbResult, error: "" };
    } else {
      return {success: false, results: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function getCurrentContainerShipment(containerID) {
  try {
    const client = await connect()
    const collection = client.collection('shipments');
    console.log("containerID", containerID);
    const dbResult = await collection.findOne({ container_id: parseInt(containerID) }, { sort: { start_date: -1 }}); // Ordena por fecha de inicio de envío de forma descendente. Obtener fecha más actual
    console.log(dbResult)
    if (dbResult) {
      // console.log("Documentos obtenidos:", dbResult);
      return {success: true, result: dbResult, error: "" };
    } else {
      return {success: false, result: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function db_startShipment(shipment) {
  try {
    const client = await connect()
    const collection = client.collection('shipments');
    await collection.createIndex({ id: 1 }, { unique: true });
    // Crear un índice único en shipment_data.tracking_number
    await collection.createIndex({ "shipment_data.tracking_number": 1 }, { unique: true });

    // Verificar si el número de rastreo ya existe
    const existingTracker = await collection.findOne({ "shipment_data.tracking_number": shipment.shipment_data.tracking_number });

    if (existingTracker) {
      return { success: false, result: "", error: "El número de rastreo ya existe. No se puede registrar el envío." };
    }

    const dbResult = await collection.insertOne(shipment);
    if (dbResult.acknowledged) {
      return { success: true, result: "¡Se ha registrado el envío!", error: "" };
    } else {
      return { success: false, result: "", error: "Ocurrió un error al registrar el envío. Inténtelo nuevamente!" }
    }
    
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}

export async function db_updateTracker(trackerId, nickname, img) {
  try {
    const client = await connect()
    const collection = client.collection('trackers');
    const dbResult = await collection.updateOne({id: trackerId}, {$set: {nickname: nickname, img: img}});
    if (dbResult.acknowledged) {
      return { success: true, result: "¡Se ha actualizado el tracker!", error: "" };
    } else {
      return { success: false, result: "", error: "Ocurrió un error al actualizar el tracker. Inténtelo nuevamente!" }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error);
    return {success: false, message: error};
  } finally {
    if (client) {
      await disconnect();
    }
  }
}


// ----------------------- App Controller -----------------------







// ----------------------- Funciones auxiliares -----------------------

