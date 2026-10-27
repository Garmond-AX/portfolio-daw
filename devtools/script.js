/* ========================================
   DEVTOOLS — DEVELOPER TOOLKIT
   JavaScript functionality
======================================== */

"use strict";

// ========================================
// TOOL 01 — TEXT COUNTER
// ========================================

const textInput = document.getElementById("text-input");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const lineCount = document.getElementById("line-count");
const clearTextButton = document.getElementById("clear-text");

function updateTextStats() {
    const text = textInput.value;

    // Count every character, including spaces.
    charCount.textContent = text.length;

    // Count words separated by whitespace.
    const trimmedText = text.trim();
    const words = trimmedText === "" ? [] : trimmedText.split(/\s+/);
    wordCount.textContent = words.length;

    // Empty text has zero lines.
    lineCount.textContent = text === "" ? 0 : text.split("\n").length;
}

textInput.addEventListener("input", updateTextStats);

clearTextButton.addEventListener("click", () => {
    textInput.value = "";
    updateTextStats();
    textInput.focus();
});


// ========================================
// TOOL 02 — TEXT CONVERTER
// ========================================

const convertInput = document.getElementById("convert-input");
const convertOutput = document.getElementById("convert-output");
const copyConvertedButton = document.getElementById("copy-converted");

const caseButtons = document.querySelectorAll("[data-case]");

function toTitleCase(text) {
    return text.toLocaleLowerCase("es").replace(
        /(^|[\s\-–—])([^\s\-–—])/gu,
        (match, separator, character) =>
            separator + character.toLocaleUpperCase("es")
    );
}

function toSentenceCase(text) {
    const lowerText = text.toLocaleLowerCase("es");
    let capitalizeNext = true;

    return lowerText.replace(/[\s\S]/gu, (character) => {
        if (capitalizeNext && /[a-záéíóúüñ]/iu.test(character)) {
            capitalizeNext = false;
            return character.toLocaleUpperCase("es");
        }

        if (/[.!?¿¡\n]/u.test(character)) {
            capitalizeNext = true;
        }

        return character;
    });
}

caseButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const text = convertInput.value;
        const selectedCase = button.dataset.case;

        switch (selectedCase) {
            case "upper":
                convertOutput.value = text.toLocaleUpperCase("es");
                break;

            case "lower":
                convertOutput.value = text.toLocaleLowerCase("es");
                break;

            case "title":
                convertOutput.value = toTitleCase(text);
                break;

            case "sentence":
                convertOutput.value = toSentenceCase(text);
                break;
        }
    });
});


// ========================================
// CLIPBOARD HELPER
// ========================================

async function copyToClipboard(text) {
    if (!text) {
        return false;
    }

    // Modern clipboard API works on HTTPS or localhost.
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Try the fallback below.
        }
    }

    // Fallback for browsers or contexts without Clipboard API.
    const temporaryTextarea = document.createElement("textarea");
    temporaryTextarea.value = text;
    temporaryTextarea.setAttribute("readonly", "");
    temporaryTextarea.style.position = "fixed";
    temporaryTextarea.style.opacity = "0";

    document.body.appendChild(temporaryTextarea);
    temporaryTextarea.select();

    let copied = false;

    try {
        copied = document.execCommand("copy");
    } catch (error) {
        copied = false;
    }

    temporaryTextarea.remove();
    return copied;
}

copyConvertedButton.addEventListener("click", async () => {
    const text = convertOutput.value;

    if (!text) {
        copyConvertedButton.textContent = "Sin resultado";
        return;
    }

    const copied = await copyToClipboard(text);
    copyConvertedButton.textContent = copied ? "¡Copiado!" : "No se pudo copiar";

    setTimeout(() => {
        copyConvertedButton.textContent = "Copiar resultado";
    }, 1600);
});


// ========================================
// TOOL 03 — PASSWORD GENERATOR
// ========================================

const passwordOutput = document.getElementById("password-output");
const passwordLength = document.getElementById("password-length");
const lengthValue = document.getElementById("length-value");
const includeUpper = document.getElementById("include-upper");
const includeLower = document.getElementById("include-lower");
const includeNumbers = document.getElementById("include-numbers");
const includeSymbols = document.getElementById("include-symbols");
const generatePasswordButton = document.getElementById("generate-password");
const copyPasswordButton = document.getElementById("copy-password");
const passwordMessage = document.getElementById("password-message");

const characterSets = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{}?"
};

passwordLength.addEventListener("input", () => {
    lengthValue.textContent = passwordLength.value;
});

function secureRandomIndex(max) {
    const randomValues = new Uint32Array(1);
    const limit = Math.floor(4294967296 / max) * max;

    do {
        crypto.getRandomValues(randomValues);
    } while (randomValues[0] >= limit);

    return randomValues[0] % max;
}

function secureShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = secureRandomIndex(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

function generatePassword() {
    const selectedSets = [];

    if (includeUpper.checked) {
        selectedSets.push(characterSets.upper);
    }

    if (includeLower.checked) {
        selectedSets.push(characterSets.lower);
    }

    if (includeNumbers.checked) {
        selectedSets.push(characterSets.numbers);
    }

    if (includeSymbols.checked) {
        selectedSets.push(characterSets.symbols);
    }

    if (selectedSets.length === 0) {
        passwordOutput.value = "";
        passwordMessage.textContent =
            "Selecciona al menos un tipo de carácter.";
        return;
    }

    const length = Number(passwordLength.value);

    // Guarantee at least one character from every selected set.
    const passwordCharacters = selectedSets.map((set) => {
        return set[secureRandomIndex(set.length)];
    });

    const allCharacters = selectedSets.join("");

    while (passwordCharacters.length < length) {
        passwordCharacters.push(
            allCharacters[secureRandomIndex(allCharacters.length)]
        );
    }

    secureShuffle(passwordCharacters);

    passwordOutput.value = passwordCharacters.join("");
    passwordMessage.textContent = "Contraseña generada correctamente.";
}

generatePasswordButton.addEventListener("click", generatePassword);

copyPasswordButton.addEventListener("click", async () => {
    const password = passwordOutput.value;

    if (!password) {
        passwordMessage.textContent = "Genera una contraseña primero.";
        return;
    }

    const copied = await copyToClipboard(password);

    passwordMessage.textContent = copied
        ? "Contraseña copiada al portapapeles."
        : "No se pudo copiar. Selecciona el texto manualmente.";
});


// ========================================
// INITIAL STATE
// ========================================

updateTextStats();
lengthValue.textContent = passwordLength.value;