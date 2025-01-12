const NameKey = 'Nummer';
const CreditsKey = 'ECTS-Punkte';
const MarkKey = 'Bewertung';
const GradeKey = 'Grad';
const ItemDetailKeys = [NameKey, CreditsKey, MarkKey, GradeKey];
const ModuleTypeKey = 'Modul-Typ';
const ModuleTableHeaders = [NameKey, ModuleTypeKey, CreditsKey, MarkKey, GradeKey]

const GradesCount = {A: 0, B: 0, C: 0, D: 0, E: 0, F: 0};
const CreditsByModuleTypeCount = {
    Kernmodul: 0,
    Projektmodul: 0,
    Erweiterungsmodul: 0,
    Majormodul: 0,
    Zusatzmodul: 0
};

let totalCredits = 0;
let totalGrades = 0;
let totalNumericMark = 0;
let numberOfNumericMarks = 0;
let totalNumericMarkWithF = 0;
let numberOfNumericMarksWithF = 0;

/*
 * Gets the value ("y") of a specified key ("x") in a 'detail' element of the API response.
 * detail: [
 *   key: "x",
 *   val: "y"
 * ]
 */
function getItemDetailsValueByKey(details, key) {

    for (detail of details) {
        if (key == detail.key) {
            return detail.val;
        }
    }
    return '';
}

/*
 * The module name includes the module id.
 * But there are different formats for the module names.
 *
 * Modules that are parsed:
 *   Usually a module name looks like this: I.BA_IPCV.F1901
 *   There are modules that have a suffix after a second underscore: I.BA_AISO_E.F1901
 *
 * Modules that are not parsed:
 *   There are modules without underscores in the name: I.ANRECHINDIVID.F1901
 *   Only the ANRECHINDIVID module is known to have this format.
 *   Probably counted as 'Erweiterungsmodul'.
 */
function getModuleIdFromModuleName(moduleName) {

    let name = String(moduleName);

    if (name.includes('_')) {

        // for module names like I.BA_AISO_E.F1901
        name = name.split('_')[1];

        // module names like I.BA_IPCV.F1901 need an additional split
        if (name.includes('.')) {
            name = name.split('.')[0];
        }
        return name;
    }
    else if (name.includes('.')) {

        // for module names like I.ANRECHINDIVID.F1901
        return name.split('.')[1];
    }
    else {
        console.log('module id not parseable: ' + moduleName);
        return null;
    }
}

/*
 * Creates one row of the modules table.
 */
function createModulesTableRow(parsedModule) {

    let tr = document.createElement('tr');

    ModuleTableHeaders.forEach(attributeKey => {
        let td = document.createElement('td');
        td.appendChild(document.createTextNode(parsedModule[attributeKey]));
        tr.appendChild(td);
    });

    return tr;
}

/*
 * Dynamically creates a table that contains all modules the student has visited.
 * Shows Module Identifier (Nummer), Credits (ECTS), Module-Type, Numeric Mark (1-6) and Grade (A-F).
 */
function createModulesTable(div, modules) {

    let table = document.createElement('table');

    let header = table.createTHead();
    let row = header.insertRow(0);
    for (let i = 0; i < ModuleTableHeaders.length; i++) {
        let cell = row.insertCell(i);
        cell.appendChild(document.createTextNode(ModuleTableHeaders[i]));
        cell.setAttribute('style', 'font-weight: bold');
    }

    let tbody = document.createElement('tbody');

    modules.forEach(parsedModule => {
        let tr = createModulesTableRow(parsedModule);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    div.insertBefore(table, div.firstChild);
}

/*
 * Create a table that shows how many ECTS for each type of module have been achieved.
 */
async function createCreditsByModuleTypeTable(div) {

    let template = await fetch(getExtensionInternalFileUrl('templates/credits_by_module_type_table.html'))
        .then(response => response.text());

    let creditsByModuleTypeTable = document.createElement('div');
    for (let moduleKey in CreditsByModuleTypeCount) {
        template = template.replace('ECTS-' + moduleKey, CreditsByModuleTypeCount[moduleKey]);
    }
    creditsByModuleTypeTable.innerHTML = template;
    div.insertBefore(creditsByModuleTypeTable, div.firstChild);
}

/*
 * Creates a table that puts each possible grade (A-F) in comparison.
 * Shown is, how many time a grade has been achieved and the percentage,
 * in comparison with the other grades.
 */
async function createGradesOverviewTable(div) {

    let gradesTableTemplate = await fetch(getExtensionInternalFileUrl('templates/grades_table.html'))
        .then(response => response.text());

    let gradeOverviewTable = document.createElement('div');
    for (let gradeId in GradesCount) {
        gradesTableTemplate = String(gradesTableTemplate).replace('count-' + gradeId, GradesCount[gradeId]);
        let gradePercentageRounded = Math.round(10000 * GradesCount[gradeId] / totalGrades) / 100;
        gradesTableTemplate = gradesTableTemplate.replace('percentage-' + gradeId, gradePercentageRounded + "%");
    }
    gradeOverviewTable.innerHTML = gradesTableTemplate;
    div.insertBefore(gradeOverviewTable, div.firstChild);
}

/*
 * Create a simple header for the modules table.
 */
function createModulesTableTitle(div) {

    let modulesTitle = document.createElement('h2');
    modulesTitle.appendChild(document.createTextNode('Modulübersicht'));
    div.insertBefore(modulesTitle, div.firstChild);
}

/*
 * Create a heading that displays the number of achieved credits.
 */
function createTotalCreditsTitle(div) {

    let totalCreditsTitle = document.createElement('h2');
    totalCreditsTitle.appendChild(document.createTextNode('ECTS-Punkte: ' + totalCredits + '/180'));
    div.insertBefore(totalCreditsTitle, div.firstChild);
}

/*
 * Create a heading that displays the average mark over all modules.
 * Modules with grade F are not counted in the average.
 * A second average is displayed, where the modules with grade F are
 *  taken into account.
 */
function createAverageMarkTitle(div) {

    let averageMarkTitle = document.createElement('h2');
    let average = Math.round(totalNumericMark / numberOfNumericMarks * 100) / 100;
    let averageWithF = Math.round(totalNumericMarkWithF / numberOfNumericMarksWithF * 100) / 100;
    averageMarkTitle.appendChild(document.createTextNode('Noten Ø: ' + average + ' (Ø mit F: ' + averageWithF + ')'));
    div.insertBefore(averageMarkTitle, div.firstChild);
}

/*
 * Helper method to read a file that is included in this browser extension.
 * The file needs to be registered in manifest.json!
 * Chome and Firefox have different APIs for this.
 */
function getExtensionInternalFileUrl(filePath) {

    let internal_file;
    if (typeof browser !== 'undefined') {
        // firefox
        internal_file = browser.runtime.getURL(filePath);
    }
    else {
        // chrome
        internal_file = chrome.runtime.getURL(filePath);
    }
    return internal_file;
}

/*
 * Add custom CSS rules to the document.
 */
async function injectCustomCss(div) {

    const css = await fetch(getExtensionInternalFileUrl('templates/custom_styles.css'))
        .then(response => response.text());
    let style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    div.insertBefore(style, div.firstChild);
}

/*
 * Generates an array of module objects from the API and the module type mapping json file.
 */
async function generateModuleObjects() {

    const API_URL = "https://mycampus.hslu.ch/de-ch/api/anlasslist/load/?page=1&per_page=250&total_entries=100&datasourceid=5158ceaf-061f-49aa-b270-fc309c1a5f69"

    const modules = []

    let moduleTypeList = await fetch(getExtensionInternalFileUrl('data/modules_i.json'))
        .then(response => response.json());

    let pageData = await fetch(API_URL)
        .then(response => response.json());

    pageData.items.forEach(item => {

        let parsedModule = {};

        let passed = item.prop1[0].text == 'Erfolgreich teilgenommen';
        parsedModule.passed = passed;

        let details = item.details;
        ItemDetailKeys.forEach(key => {
            let value = getItemDetailsValueByKey(details, key);
            parsedModule[key] = value;
        });

        let moduleId = getModuleIdFromModuleName(parsedModule[NameKey]);
        parsedModule[ModuleTypeKey] = moduleTypeList[moduleId];

        modules.push(parsedModule);
    })

    return modules;
}

function calculateStats(modules) {

    modules.forEach(parsedModule => {
        if (parsedModule[GradeKey] != '') {
            GradesCount[parsedModule[GradeKey]]++;
            totalGrades++;
        }
        if (parsedModule.passed) {
            let credits = Number(parsedModule[CreditsKey]);
            totalCredits += credits;
            let moduleType = parsedModule[ModuleTypeKey]
            if (moduleType in CreditsByModuleTypeCount) {
                CreditsByModuleTypeCount[moduleType] += credits;
            }
        }
        // if cell is empty, Number('') returns 0!
        numericMark = Number(parsedModule[MarkKey])
        if (!isNaN(numericMark) && numericMark != 0) {
            totalNumericMarkWithF += numericMark;
            numberOfNumericMarksWithF++;
            if (parsedModule.passed) {
                totalNumericMark += numericMark;
                numberOfNumericMarks++;
            }
        }
    });
}

async function generateHtml(modules) {

    calculateStats(modules);

    let div = document.getElementsByClassName('row teaser-section None')[0];
    createModulesTable(div, modules);
    createModulesTableTitle(div);

    await createCreditsByModuleTypeTable(div);
    createTotalCreditsTitle(div);

    await createGradesOverviewTable(div);
    createAverageMarkTitle(div);

    await injectCustomCss(div);
}

generateModuleObjects()
    .then(modules => generateHtml(modules))
    .catch(e => {
        console.log("Booo");
        console.log(e);
    });
