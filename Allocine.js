export async function action(data, callback) {

	try {
		
		const tblActions = {
			getMovie : () => getMovie(data.client)					
		}
		
		info("Allocine:", data.action.command, L.get("plugin.from"), data.client);
			
		tblActions[data.action.command]()
	} catch (err) {
		if (data.client) Avatar.Speech.end(data.client);
		if (err.message) error(err.message);
	}	
		
	callback();
 
}


async function getMovie(data, client) {

  try {

    const numSalle = Config.modules.Allocine.numSalle;

    if (!numSalle) {
      Avatar.speak("Le numéro de salle de cinéma n'est pas renseigné dans le fichier propriété.", client, () => {
        Avatar.Speech.end(client);
      });
      return;
    }

    const response = await fetch(`https://www.allocine.fr/_/showtimes/theater-${numSalle}`);

    if (!response.ok) {
      throw new Error("Erreur réseau");
    }

    const json = await response.json();

    if (!json.results || json.results.length === 0) {
      Avatar.speak("Je n'ai trouvé aucun film dans ce cinéma.", client, () => {
        Avatar.Speech.end(client);
      });
      return;
    }

    // Récupère les titres des films
    const films = json.results
      .slice(0, 10) // limite à 10 films
      .map(r => r.movie?.title)
      .filter(Boolean);

    const message = `Voici les films à l'affiche : ${films.join(". ")}`;

    Avatar.speak(message, client, () => {
      Avatar.Speech.end(client);
    });

  } catch (error) {

    error("AlloCine:", error);

    Avatar.speak("Je n'arrive pas à accéder au site Allociné.", client, () => {
      Avatar.Speech.end(client);
    });

  }

}
