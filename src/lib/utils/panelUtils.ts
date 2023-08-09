const isUpperCase = (c: string) => {
	return c === c.toUpperCase();
};

const camelToLowerCase = (s: string) => {
	const lowerCaseChars = [];
	for (const c of s) {
		if (isUpperCase(c)) {
			lowerCaseChars.push(' ', c.toLowerCase());
		} else {
			lowerCaseChars.push(c);
		}
	}
	return lowerCaseChars.join('');
};

const camelToKebabCase = (s: string) => {
	const kebabCaseChars = [];
	for (const c of s) {
		if (isUpperCase(c)) {
			kebabCaseChars.push('-', c.toLowerCase());
		} else {
			kebabCaseChars.push(c);
		}
	}
	return kebabCaseChars.join('');
};

export { camelToLowerCase, camelToKebabCase };
