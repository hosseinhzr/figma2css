import fs from 'fs';
import path from 'path';

interface IJsonData {
    variables: Array<{
        name: string;
        type: string;
        resolvedValuesByMode: {
            [key: string]: {
                resolvedValue: Irgba | string | number;
            }
        }
    }>;
    modes: {
        [key: string]: string;
    };
}

interface Irgba {
    r: number,
    g: number,
    b: number,
    a: number,
}

const roundToDecimals = (num: number, maxDecimals: number = 3): number => parseFloat(num.toFixed(maxDecimals));

const rgbToCss = (value: Irgba): string => {
    const r = roundToDecimals(Math.round(value.r * 255));
    const g = roundToDecimals(Math.round(value.g * 255));
    const b = roundToDecimals(Math.round(value.b * 255));
    const a = roundToDecimals(Math.round(value.a * 255));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const valueTypes: { [type: string]: (value: Irgba | string | number) => string } = {
    'COLOR': value => rgbToCss(value as Irgba),
    'FLOAT': value => `${roundToDecimals(value as number, 2)}px`,
    'STRING': value => value as string,
}

const valueToCss = (type: string, value: Irgba | string | number): string => valueTypes[type](value);


const handleSelectorName = (selector: string): string => {
    selector = selector
        .replace(/[\s\(\)<>\:\/]/g, '-')  // Remove invalid characters
        .replace(/-+/g, '-')             // Replace multiple dashes with a single dash
        .replace(/-$/, '');              // Remove trailing dash

    // Check if selector starts with a number and handle it
    selector.match(/^\d/) && (selector = handleSlecetorStartingWithNumber(selector));

    return selector.toLowerCase();
}

const handleSlecetorStartingWithNumber = (selector: string) => {
    const chars = selector.replace(/[0-9]/g, '');
    const numbers = selector.replace(/[^0-9]/g, '');
    return chars + numbers;
}

const convertJsonToCss = (data: IJsonData): string => {
    let cssContent = '';

    for (const modeId in data.modes) {
        let modeName = handleSelectorName(data.modes[modeId]);

        cssContent += `.${modeName} {\n`;

        data.variables.forEach(variable => {
            const variableName = handleSelectorName(variable.name);
            const value = variable.resolvedValuesByMode[modeId]?.resolvedValue;

            value && (cssContent += `\t--${variableName}: ${valueToCss(variable.type, value)};\n`);
        })

        cssContent += `}\n\n`;
    }

    return cssContent;
}

const figmaDirectory = './figma';
const cssDirectory = './css';

// Read all files in the figma directory
const filesInFigmaDirectory = fs.readdirSync(figmaDirectory);

// Filter out only JSON files
const jsonFiles = filesInFigmaDirectory.filter(file => path.extname(file) === '.json');

// Process each JSON file
jsonFiles.forEach(jsonFile => {
    const sourceFilePath = path.join(figmaDirectory, jsonFile);
    const jsonData: IJsonData = JSON.parse(fs.readFileSync(sourceFilePath, 'utf-8'));
    const cssContent = convertJsonToCss(jsonData);
    const outputFileName = path.basename(jsonFile.toLowerCase(), '.json') + '.css';
    fs.writeFileSync(path.join(cssDirectory, outputFileName), cssContent, 'utf-8');
});
