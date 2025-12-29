import { dbClient } from '#config/mongodb.js';
import { consoleLog, isEmptyObj } from '#controllers/modules/utils.mjs';

export async function consultaEmpresasPaqueteria() {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipment_companies');
    const dbResult = await collection.find({}).toArray();

    if (dbResult) {
      consoleLog("Documentos obtenidos:", dbResult);
      return {success: true, catalogo: dbResult, error: "" };
    } else {
      return {success: false, catalogo: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, catalogo: {}, error: error}
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}

export async function getUserContainers(userID) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('trackers');
    const dbResult = await collection.find({ user_id: userID}).toArray();
    if (dbResult) {
      consoleLog("Documentos obtenidos:", dbResult);
      return {success: true, results: dbResult, error: "" };
    } else {
      return {success: false, results: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}

export async function getAppInfo(userID) {
  let client = null;
  try {
    client = await dbClient.connect();
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
      await dbClient.disconnect();
    }
  }
}

export async function registerNewShipment(shipment) {
  let client = null;
  try {
    client = await dbClient.connect();
    const shipmentCollection = client.collection('shipments');
    const shipmentID = generarOTP();
    consoleLog("shipmentID", shipmentID);
    shipment.id = shipmentID;
    consoleLog("shipment", shipment);
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
      await dbClient.disconnect();
    }
  }
}

export async function updateShipment(shipmentID, newLocation, newStatus) {
  consoleLog('updateShipment', "empieza", true);
  let client = null;
  try {
    client = await dbClient.connect();
    const shipmentCollection = client.collection('shipments');
    consoleLog("shipmentID", shipmentID);
    consoleLog("newLocation", newLocation);
    consoleLog("newStatus", newStatus);
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
      await dbClient.disconnect();
    }
  }
}

export async function linkTracker(tracker) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('trackers');

    // Verifica si existe el rastreador 
    const existingTracker = await collection.findOne({ id: tracker.id });
    if(!existingTracker) return { success: false, error: "El rastreador ingresado no existe. Ingrese otro número de serie" };

    // Verifica si el tracker ya está vinculado a otro usuario 
    if(existingTracker.user_id) {
      if (existingTracker.user_id === tracker.user_id) { 
        return { success: false, error: "El tracker ya está vinculado a este usuario." }
      } 
      else { 
        return { success: false, error: "El tracker ya está vinculado a otro usuario." }
      }
    }

    // await collection.createIndex({ id: 1 }, { unique: true });

    const dbResult = await collection.updateOne({id: tracker.id}, {$set: {user_id: tracker.user_id, nickname: tracker.nickname, 
        img: tracker.img, linking_date: tracker.linking_date, shipments: tracker.shipments}});
    if (dbResult.acknowledged) {
      return { success: true, result: "¡Se ha vinculado el tracker a su cuenta!", error: "" };
    } else {
      return { success: false, result: "", error: "Ocurrió un error al vincular el tracker. Inténtelo nuevamente!" }
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

export async function getContainerShipments(containerID) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    
    // Corrige la proyección aquí
    const dbResult = await collection.find(
      { container_id: parseInt(containerID) },
      { projection: { start_date: 1, delivery_date: 1, id: 1 } } // Usar 'projection'
    ).toArray();
    
    if (dbResult.length > 0) { // Verifica si hay documentos
      consoleLog("Documentos obtenidos:", dbResult);
      return { success: true, results: dbResult, error: "" };
    } else {
      return { success: false, results: {}, error: "No se encontraron envíos para el contenedor" };
    }
  } catch (error) {
    console.error('Error al obtener el catálogo.', error);
    return { success: false, results: {}, error: error.message }; // Usa error.message para más claridad
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}


export async function db_getShipmentInfo(id) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    const dbResult = await collection.findOne({ id: parseInt(id)});
    if (dbResult) {
      consoleLog("Documentos obtenidos:", dbResult);
      return {success: true, results: dbResult, error: "" };
    } else {
      return {success: false, results: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}

export async function getCurrentContainerShipment(containerID) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    consoleLog("containerID", containerID);
    const dbResult = await collection.findOne({ container_id: parseInt(containerID) }, { sort: { start_date: -1 }}); // Ordena por fecha de inicio de envío de forma descendente. Obtener fecha más actual
    consoleLog("dbResult",dbResult)
    if (dbResult) {
      // consoleLog("Documentos obtenidos:", dbResult);
      return {success: true, result: dbResult, error: "" };
    } else {
      return {success: false, result: {}, error: "Usuario no encontrado"}
    }
  } catch (error) {
    console.error('Error al obtener el catálogo. ',error);
    return {success: false, user: {}, error: error}
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}

export async function db_startShipment(shipment) {
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    await collection.createIndex({ id: 1 }, { unique: true });
    // Crear un índice único en shipment_data.tracking_number
    await collection.createIndex({ "shipment_data.tracking_number": 1 }, { unique: true });

    // Verificar si el número de rastreo ya existe
    const existingTracker = await collection.findOne({ "shipment_data.tracking_number": shipment.shipment_data.tracking_number });

    if (existingTracker && shipment.shipment_data.tracking_number !== "") {
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
      await dbClient.disconnect();
    }
  }
}

export async function db_updateTracker(trackerId, nickname, img) {
  let client = null;
  try {
    client = await dbClient.connect();
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
      await dbClient.disconnect();
    }
  }
}

export async function db_endShipment(shipmentId, endDate) {
  let client = null;
  try {
    consoleLog("db_endShipment", endDate, true);
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    const dbResult = await collection.updateOne({id: shipmentId}, {$set: {delivery_date: endDate}});
    consoleLog("dbResult", dbResult);
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
      await dbClient.disconnect();
    }
  }
}

export async function db_changeTrackingCode(shipmentId, shipmentData){
  let client = null;
  try {
    client = await dbClient.connect();
    const collection = client.collection('shipments');
    const dbResult = await collection.updateOne({id: shipmentId}, {$set: {shipment_data: shipmentData}});
    consoleLog("dbResult", dbResult);
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
      await dbClient.disconnect();
    }
  }
}

export async function db_updateBatteryPercentage(trackerId, batteryPercentage = 0, endShipment = false) {
  consoleLog('db_updateBatteryPercentage', "empieza", true);
  let client = null;
  try {
    let battery = {
      percentage: batteryPercentage,
      allow_change: false,
      last_update: new Date()
    }
    client = await dbClient.connect();
    const collection = client.collection('trackers');
    let dbResult = await collection.findOne({id: trackerId});
    if (!dbResult) {
      return { success: false, result: "", error: "El tracker no existe." };
    }
    await collection.updateOne({id: trackerId}, {$set: {battery_percentage: battery}});
    consoleLog('db_updateBatteryPercentage - Finaliza', true);
    // if(endShipment) {
    //   // Si se está finalizando el envío, se permite cambiar el porcentaje de batería
    //   battery.allow_change = true;
    //   batteryPercentage = dbResult.battery_percentage.percentage; // Mantener el porcentaje actual
    //   await collection.updateOne({id: trackerId}, {$set: {battery_percentage: battery}});
    //   return { success: true, result: "¡Se ha actualizado el porcentaje de batería!", error: "" };
    // }

    // if (dbResult.battery_percentage.percentage < batteryPercentage && dbResult.battery_percentage.allow_change) {
    //   await collection.updateOne({id: trackerId}, {$set: {battery_percentage: battery}});
    //   consoleLog("Se actualizó el porcentaje de batería:", batteryPercentage,true);
    //   return { success: true, result: "¡Se ha actualizado el porcentaje de batería!", error: "" };
    // }else if(dbResult.battery_percentage.percentage >= batteryPercentage) {
    //   await collection.updateOne({id: trackerId}, {$set: {battery_percentage: battery}});
    //   consoleLog("Se actualizó el porcentaje de batería:", batteryPercentage,true);
    //   return { success: true, result: "¡Se ha actualizado el porcentaje de batería!", error: "" };
    // }
  } catch (error) {
    consoleLog('db_updateBatteryPercentage - Ocurrió un error:', error, true);
  } finally {
    if (client) {
      await dbClient.disconnect();
    }
  }
}