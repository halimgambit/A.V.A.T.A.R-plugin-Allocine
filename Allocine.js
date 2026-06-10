import fetch from "node-fetch";

export async function init () {
    await Avatar.lang.addPluginPak('Allocine');
}

export async function action(data, callback) {

	try {

     const L = await Avatar.lang.getPak('Allocine', data.language);
		
		const tblActions = {
			getMovie : () => getFilms("films", data, data.client, L),
      getHours: () => getFilms("hours", data, data.client, L),
      getNextHour: () => getFilms("nextHour", data, data.client, L)
		}
		
		info("Allocine:", data.action.command, "plugin.from", data.client);
			
		if (tblActions[data.action.command]) {
			await tblActions[data.action.command]();
		}

	} catch (err) {
		if (data.client) Avatar.Speech.end(data.client);
		if (err.message) error(err.message);
	}	
		
	callback();
 
}


const getFilms = async (movies, data, client, L) => {


  try {

    const numSalle = Config.modules.Allocine.numSalle;

    if (!numSalle) {
      Avatar.speak(L.get("speech.numbrSalle"), client, () => Avatar.Speech.end(client));
      return;
    }

    const lengthMovies = Config.modules.Allocine.lengthMovies;

    const response = await fetch(`https://www.allocine.fr/_/showtimes/theater-${numSalle}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();

    // ----------------------------------------
    // INTENTION 1 : LISTE DES FILMS A L'AFFICHE
    // ----------------------------------------
    if (movies === "films") {

      const films = [...new Set((json.results || []).map(r => r.movie?.title).filter(Boolean))].slice(0, lengthMovies);

      const message = L.get("speech.films", films.join(", "));

      info(message);

      Avatar.speak(message, client, () => Avatar.Speech.end(client));
      return;
    }

    // ----------------------------------------
    // INTENTION 2 : RECHERCHE DES HORAIRES
    // ----------------------------------------

  if (movies === "hours") {
 
  const normalize = (str = "") =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const sentence = normalize(data.rawSentence || data.action?.sentence || "");

  info("sentence:", sentence);

  let clean = sentence
  .replace(/^(quels?|quelles?)\s+sont\s+les\s+horaires\s+(pour|de)\s+/i, "")
  .replace(/^(quels?|quelles?)\s+sont\s+/i, "")
  .replace(/^quelle\s+est\s+/i, "")
  .replace(/^(c['’]?est)\s+/i, "")
  .replace(/^(les\s+)?horaires\s+(pour|de)\s+/i, "")
  .replace(/^(le|la|les|l)\s+/i, "")
  .replace(/\s+/g, " ")
  .trim();

  info("clean:", clean);

  if (!clean) {
    Avatar.speak(L.get("speech.clean"), client, () => Avatar.Speech.end(client));
    return;
  }

  const score = (targetTitle, searchInput) => {
    const A = normalize(targetTitle).split(" ").filter(x => x.length > 2);
    const B = normalize(searchInput).split(" ").filter(x => x.length > 2);
    return A.filter(x => B.includes(x)).length;
  };

  let movie = null;
  let bestScore = 0;

  for (const r of json.results || []) {
    const title = r.movie?.title || "";
    const s = score(title, clean);

    if (s > bestScore) {
      bestScore = s;
      movie = r;
    }
  }

  if (!movie || bestScore === 0) {

  const suggestions = (json.results || [])
    .slice(0, lengthMovies)
    .map(r => r.movie?.title)
    .filter(Boolean)
    .join(", ");

  const message = L.get("speech.noFilm", clean, suggestions);

  info(message);

  return Avatar.speak(message, client, () => Avatar.Speech.end(client));

}
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const horaires = (movie.showtimes?.multiple || [])
    .filter(s => s.startsAt?.startsWith(today))
    .map(s =>
      new Date(s.startsAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );

  const title = movie.movie?.title || "ce film";

  if (!horaires.length) {
    Avatar.speak(L.get("speech.noSeance", title), client, () => Avatar.Speech.end(client));
    info(`Je n'ai trouvé aucune séance aujourd'hui pour ${title}.`);
    return;
  }

  const message = L.get("speech.horaire", title, horaires.join(", "));

  info(L.get("speech.horaire", title, horaires.join(", ")));

 Avatar.speak(message, client, () => Avatar.Speech.end(client));
 return;
}

 // ----------------------------------------
    // INTENTION 3 : RECHERCHE DES SEANCES
    // ----------------------------------------
  

if (movies === "nextHour") {

  const normalize = (str = "") =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const sentence = normalize(data.rawSentence || data.action?.sentence || "");

  info("sentence:", sentence);

let clean = sentence
  .replace(/^(quell?e?s?|quels?)\s+(sont|est)\s+/i, "")
  .replace(/\b(quand|prochaine?|film|passe|seance|séance|pour|est|que|le|la|les|l)\b/gi, "")
  .replace(/\s+/g, " ")
  .trim();

  clean = clean.replace(/^(le|la|les|l)\s+/i, "").trim();

  info("clean:", clean);

  if (!clean) {
  Avatar.speak(L.get("speech.wichMovie"), client, () => Avatar.Speech.end(client));
  return;
  }

  const score = (targetTitle, searchInput) => {

    const A = normalize(targetTitle)
      .split(" ")
      .filter(x => x.length > 2);

    const B = normalize(searchInput)
      .split(" ")
      .filter(x => x.length > 2);

    return A.filter(x => B.includes(x)).length;
  };

  let movie = null;
  let bestScore = 0;

  for (const r of json.results || []) {

    const s = score(
      r.movie?.title || "",
      clean
    );

    if (s > bestScore) {
      bestScore = s;
      movie = r;
    }
  }

  if (!movie || bestScore === 0) {

    Avatar.speak(L.get("speech.noFound", clean), client,
      () => Avatar.Speech.end(client));
    return;
  }

  const now = new Date();

  const prochainesSeances =
    (movie.showtimes?.multiple || [])
      .map(s => new Date(s.startsAt))
      .filter(date => date > now)
      .sort((a, b) => a - b);

  if (!prochainesSeances.length) {

    Avatar.speak(L.get("speech.noShow", movie.movie.title), client,
      () => Avatar.Speech.end(client));
    return;
  }

  const prochaine = prochainesSeances[0];

  const heure = prochaine.toLocaleTimeString(
    "fr-FR", {hour: "2-digit", minute: "2-digit"}
  );

   const message = L.get("speech.nextSeance", movie.movie.title, heure);

  info(message);

  Avatar.speak(message, client, () => Avatar.Speech.end(client));
}

  } catch (err) {
    error("AlloCine:", err);
    Avatar.speak(L.get("speech.errorAccess"), client, () => Avatar.Speech.end(client));
  }
};