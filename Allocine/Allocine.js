import fetch from "node-fetch";

export async function init() {
    await Avatar.lang.addPluginPak('Allocine');
}

// Helpers de normalisation et scoring réutilisables
const normalize = (str = "") => str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const getBestMatch = (results, cleanQuery) => {
    const cleanNorm = normalize(cleanQuery);
    if (!cleanNorm) return null;

    const queryWords = cleanNorm.split(" ").filter(x => x.length >= 2);
    let bestMovie = null;
    let bestScore = 0;

    for (const r of results || []) {
        const titleNorm = normalize(r.movie?.title || "");
        
        // Match exact ou inclusion directe
        if (titleNorm === cleanNorm || titleNorm.includes(cleanNorm)) {
            return r;
        }

        // Score par mots communs
        const titleWords = titleNorm.split(" ").filter(x => x.length >= 2);
        const commonWords = queryWords.filter(x => titleWords.includes(x)).length;

        if (commonWords > bestScore) {
            bestScore = commonWords;
            bestMovie = r;
        }
    }

    return bestScore > 0 ? bestMovie : null;
};

export async function action(data, callback) {
    try {
        const L = await Avatar.lang.getPak('Allocine', data.language);

        const tblActions = {
            getMovie: () => getFilms("films", data, data.client, L),
            getHours: () => getFilms("hours", data, data.client, L),
            getNextHour: () => getFilms("nextHour", data, data.client, L)
        };

        info("Allocine:", data.action.command, "from", data.client);

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

        const lengthMovies = Config.modules.Allocine.lengthMovies || 8;
        
        const response = await fetch(`https://www.allocine.fr/_/showtimes/theater-${numSalle}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "X-Requested-With": "XMLHttpRequest",
                "Accept": "application/json, text/plain, */*"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const results = json.results || [];

        // 1. Liste des films
        if (movies === "films") {
            const films = [...new Set(results.map(r => r.movie?.title).filter(Boolean))].slice(0, lengthMovies);
            const message = L.get(["speech.films", films.join(", ")]);
            info(message);
            Avatar.speak(message, client, () => Avatar.Speech.end(client));
            return;
        }

        // Nettoyage de la phrase reçue
        const raw = data.rawSentence || data.action?.sentence || "";
        let clean = normalize(raw)
            .replace(/^(quels?|quelles?|c'est|sont|est|quand|passe)\s+/i, "")
            .replace(/\b(horaires?|seance|séance|pour|du|de|le|la|les|l|pour|film|prochaine?)\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        // 2. Horaires de la journée
        if (movies === "hours") {
            if (!clean) {
                Avatar.speak(L.get("speech.clean"), client, () => Avatar.Speech.end(client));
                return;
            }

            const movie = getBestMatch(results, clean);

            if (!movie) {
                const suggestions = results.slice(0, lengthMovies).map(r => r.movie?.title).filter(Boolean).join(", ");
                const message = L.get("speech.noFilm", clean, suggestions);
                info(message);
                return Avatar.speak(message, client, () => Avatar.Speech.end(client));
            }

            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const horaires = (movie.showtimes?.multiple || [])
                .filter(s => s.startsAt?.startsWith(today))
                .map(s => new Date(s.startsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));

            const title = movie.movie?.title || "ce film";

            if (!horaires.length) {
                Avatar.speak(L.get("speech.noSeance", title), client, () => Avatar.Speech.end(client));
                info(`Aucune séance aujourd'hui pour ${title}.`);
                return;
            }

            const message = L.get(["speech.horaire", title, horaires.join(", ")]);
            info(message);
            Avatar.speak(message, client, () => Avatar.Speech.end(client));
            return;
        }

        // 3. Prochaine séance
        if (movies === "nextHour") {
            if (!clean) {
                Avatar.speak(L.get("speech.wichMovie"), client, () => Avatar.Speech.end(client));
                return;
            }

            const movie = getBestMatch(results, clean);

            if (!movie) {
                Avatar.speak(L.get(["speech.noFound", clean]), client, () => Avatar.Speech.end(client));
                return;
            }

            const now = new Date();
            const prochainesSeances = (movie.showtimes?.multiple || [])
                .map(s => new Date(s.startsAt))
                .filter(date => date > now)
                .sort((a, b) => a - b);

            const title = movie.movie?.title;

            if (!prochainesSeances.length) {
                Avatar.speak(L.get(["speech.noShow", title]), client, () => Avatar.Speech.end(client));
                return;
            }

            const heure = prochainesSeances[0].toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const message = L.get(["speech.nextSeance", title, heure]);
            info(message);
            Avatar.speak(message, client, () => Avatar.Speech.end(client));
        }

    } catch (err) {
        error("AlloCine:", err);
        Avatar.speak(L.get("speech.errorAccess"), client, () => Avatar.Speech.end(client));
    }
};
