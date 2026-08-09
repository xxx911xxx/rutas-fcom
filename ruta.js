async function generarRuta() {
  // 1. Recogemos las contraseñas secretas de GitHub
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  // 🧠 FÓRMULA MATEMÁTICA (Haversine) para calcular distancias entre 2 coordenadas
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  try {
    // 2. Le pedimos a Supabase los usuarios
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?es_admin=eq.false&viaja_hoy=eq.true&latitud=not.is.null&select=nombre,latitud,longitud`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const pasajeros = await res.json();

    if (pasajeros.length === 0) {
      console.log("No hay pasajeros con coordenadas hoy.");
      return; // Si nadie viaja, el bot no te molesta
    }

    // Tu casa (Asegúrate de poner tus coordenadas reales aquí, sepáralas en latitud y longitud)
    const MI_CASA_LAT = 37.400314; 
    const MI_CASA_LON = -5.941991;
    const FCOM = "37.41027876546175,-6.006432374677381"; 

    // 🤖 3. ALGORITMO OPTIMIZADOR DE RUTAS
    let noVisitados = [...pasajeros]; // Copiamos la lista de pasajeros
    let rutaOrdenada = [];
    let ubicacionActual = { lat: MI_CASA_LAT, lon: MI_CASA_LON };

    // Mientras queden pasajeros por recoger en la lista...
    while (noVisitados.length > 0) {
      let indiceMasCercano = 0;
      let distanciaMinima = Infinity;

      // Comparamos la distancia a todos los que faltan
      for (let i = 0; i < noVisitados.length; i++) {
        let dist = calcularDistancia(ubicacionActual.lat, ubicacionActual.lon, noVisitados[i].latitud, noVisitados[i].longitud);
        
        if (dist < distanciaMinima) {
          distanciaMinima = dist;
          indiceMasCercano = i;
        }
      }

      // Sacamos al ganador de la lista de 'noVisitados' y lo metemos en la 'rutaOrdenada'
      let pasajeroMasCercano = noVisitados.splice(indiceMasCercano, 1)[0];
      rutaOrdenada.push(pasajeroMasCercano);
      
      // Actualizamos nuestra posición a la casa de este pasajero para buscar al siguiente
      ubicacionActual = { lat: pasajeroMasCercano.latitud, lon: pasajeroMasCercano.longitud };
    }
    // --- FIN DEL ALGORITMO ---

    // 4. Montamos los enlaces para Google Maps con el orden perfecto
    const paradas = rutaOrdenada.map(p => `${p.latitud},${p.longitud}`).join('|');
    const MI_CASA = `${MI_CASA_LAT},${MI_CASA_LON}`;
    
    const enlaceGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${MI_CASA}&destination=${FCOM}&waypoints=${paradas}`;
    
    // Hacemos una lista de texto chula para que la leas rápido en Telegram
    let textoOrden = rutaOrdenada.map((p, index) => `${index + 1}º - ${p.nombre.split(" ")[0]}`).join('\n');
    
    const textoMensaje = `🚗 ¡Buenos días Yisu!\n\nHoy llevas a ${pasajeros.length} persona(s).\n\n📍 Orden de recogida:\n${textoOrden}\n\n🗺️ Ruta optimizada (Toca para ir):\n${enlaceGoogleMaps}`;

    // 5. Se lo enviamos a Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(textoMensaje)}`);
    console.log("¡Mensaje optimizado enviado con éxito!");

  } catch (error) {
    console.error("Hubo un error:", error);
  }
}

generarRuta();
