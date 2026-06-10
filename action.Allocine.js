import {default as _helpers} from '../../ia/node_modules/ava-ia/helpers/index.js'

export default function (state) {
  return new Promise((resolve, reject) => {

    //try {

      setTimeout(() => { 
			state.action = {
				module: 'Allocine',
				command: state.rule
			};
			resolve(state);
		}, Config.waitAction.time);
	});
}

  /*
      const normalize = str =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      let sentence = normalize(state.rawSentence);

      const triggers = [
        "cest quand passe",
        "quand passe",
        "prochaine seance"
      ];

      let nextHour = triggers.some(trigger => sentence.includes(trigger));

      setTimeout(() => {

        if (nextHour) {
          state.action = {
            module: 'Allocine',
            command: 'nextHour',
          };
        } else {
          if (state.debug) info('Action Allocine');

          state.action = {
            module: 'Allocine',
            command: state.rule,
          };
        }

        resolve(state);

      }, Config.waitAction.time);

    } catch (error) {
      reject(new Error(`Une erreur s'est produite lors du traitement de la commande Allociné: ${error.message}`));
    }

  });
}
  */
