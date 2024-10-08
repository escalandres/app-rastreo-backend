import { guardarCoordenadas } from "./modules/database.mjs";

export async function subirDatos(req, res){
    try {
        const coordenadas = req.body.datos;
        console.log("Coordenadas:",coordenadas);
        const result = await guardarCoordenadas(JSON.parse(coordenadas));
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