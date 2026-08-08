async function generarRuta() {
  // 1. Recogemos las contraseñas secretas de GitHub
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const CHAT_ID = process.env.CHAT_ID;

  try {
    // 2. Le pedimos a Supabase los usuarios (Tus amigos) que NO son admin
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?es_admin=eq.false&viaja_hoy=eq.true&latitud=not.is.null&select=nombre,latitud,longitud`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const pasajeros = await res.json();

    if (pasajeros.length === 0) {
      console.log("No hay pasajeros con coordenadas hoy.");
      return; // Si nadie viaja, el bot no te molesta
    }

    // 3. Montamos las paradas de Google Maps
    const paradas = pasajeros.map(p => `${p.latitud},${p.longitud}`).join('|');
    
    // Tu casa (Asegúrate de poner tus coordenadas reales aquí, he puesto unas de Sevilla Centro de ejemplo)
    const MI_CASA = "37.400314,-5.941991"; 
    const FCOM = "37.41027876546175,-6.006432374677381"; // Coordenadas aproximadas de la FCom en la Cartuja

    // 4. Creamos el enlace mágico
    const enlaceGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${MI_CASA}&destination=${FCOM}&waypoints=${paradas}`;
    const textoMensaje = `🚗 ¡Buenos días Yisu!\n\nHoy llevas a ${pasajeros.length} persona(s).\n📍 Aquí tienes tu ruta optimizada:\n\n${enlaceGoogleMaps}`;

    // 5. Se lo enviamos a Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(textoMensaje)}`);
    console.log("¡Mensaje enviado con éxito!");

  } catch (error) {
    console.error("Hubo un error:", error);
  }
}

generarRuta();
