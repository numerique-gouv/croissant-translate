export enum Prompt {
	SentenceEnglishToFrench = 'promptSentenceEnglishToFrench',
	SentenceFrenchToEnglish = 'promptSentenceFrenchToEnglish',
	FrenchToEnglish = 'promptFrenchToEnglish',
	EnglishToFrench = 'promptEnglishToFrench',
}

export const promt_description: { [key in Prompt]: string } = {
	promptSentenceEnglishToFrench:
		"Pouvez-vous traduire ce texte en francais sans ajouter d'informations ? Voici le texte :",
	promptSentenceFrenchToEnglish:
		'Can you translate this text in english for me without adding informations: ',
	promptFrenchToEnglish:
		'Translate these words in english. Just write the word translated, nothing else: ',
	promptEnglishToFrench:
		'Traduis ces mots en francais. Ecris juste la traduction : ',
};
