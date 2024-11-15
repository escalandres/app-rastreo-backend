import { guardarCoordenadas } from "./modules/database.mjs";

function formatDate(inputDate) {
    // Divide la fecha y la hora
    const [datePart, timePart] = inputDate.split(',');

    // Divide los componentes de la fecha
    const [yy, MM, dd] = datePart.split('/');

    // Divide los componentes de la hora
    const [hh, mm] = timePart.split(':');

    // Formatea la nueva fecha
    const formattedDate = `${dd}/${MM}/20${yy} a las ${hh}:${mm}`;

    return formattedDate;
}

function extraerDatos(mensaje) {
    // mensaje.replace('AT+', '');
    //console.log("mensaje", mensaje);
    // Expresión regular para extraer los datos
    // const regex = /\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;
    // const regex = /AT\+CMGR=\d+\+CMGR:\s'REC UNREAD','(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);OK/;
    const regex = /\+CMT:\s'(\+52\d{10,12})','','(\d{2}\/\d{2}\/\d{2},\d{2}:\d{2}:\d{2}-\d{2})'id:(\d+),latitud:([-\d.]+),longitud:([-\d.]+);/;

    const resultado = regex.exec(mensaje);

    if (resultado) {
        const objetoDatos = {
            numero: resultado[1],
            fecha: formatDate(resultado[2]),
            id: resultado[3],
            latitud: parseFloat(resultado[4]),
            longitud: parseFloat(resultado[5])
        };
        return objetoDatos;
    } else {
        throw new Error("Formato de mensaje no válido");
    }
}

export async function subirDatos(req, res){
    try {
        const coordenadas = extraerDatos(req.body.datos);
        console.log("Coordenadas:",coordenadas);
        const result = await guardarCoordenadas(coordenadas);
        if(!result.success){
            return res.status(400).json({success: false, message: "Error al guardar coordenadas"})
        }else{
            return res.status(200).json({success: true, message: "Coordenadas guardadas correctamente"})
        }
    } catch (error) {
        console.error('Ocurrio un error:',error);
        // Enviar respuesta JSON indicando fallo
        res.status(400).json({ success: false , message: "Error al guardar coordenadas"});
    }
}