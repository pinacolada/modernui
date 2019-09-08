class IndexedDataBase {
    /**
     * Base de données persistante (dans le navigateur)
     */
    _base!: IDBDatabase;
    _store!: IDBObjectStore;
    _transaction!: IDBTransaction;
    _cursor!: IDBCursor;
    constructor(public db: DataBase) {
        this.openBase();
    }
    get name(): string { return this.db.name; }
    get base(): IDBDatabase { return this._base; }
    set base(value: IDBDatabase) { this._base = value; }
    get store(): IDBObjectStore { return this._store; }
    set store(value: IDBObjectStore) { this._store = value; }
    get version(): number { return this._base.version; }
    set version(value: number) {
        // Si on demande un autre numéro de version, on provoque l'ouverture
        if (value !== this.base.version) this.openBase(value);
    }
    openBase(version?: number | undefined) {
        // pas de version = version existante | création
        let opening: IDBOpenDBRequest = indexedDB.open(this.name, version);
        opening.onerror = () => {
            console.log(`OpenBase error : ${this.name} vers.${version} State = ${opening.readyState}`);
        }
        opening.onupgradeneeded = () => {
            this.base = opening.result;
            console.log(`OpenBase upgrade : ${this.base.name} vers.${this.base.version} State = ${opening.readyState}`);
            this.upgradeBase();
        }
        opening.onsuccess = () => {
            this.base = opening.result;
            console.log(`OpenBase success : ${this.base.name} vers.${this.base.version} State = ${opening.readyState}`);
            if (confirm("Faut-il détruire la base construite ?")) this.deleteBase();
        }
    }
    upgradeBase() {
        console.log(`Upgrading base ${this.name} vers.${this.version}...`);
        this.db.tables.forEach(table => this.createTable(table));
    }
    createTable(table: DataTable) {
        console.log("Creating table", table.name, "(Fields :", table.numFields, "- Rows :", table.numRows, ")");
        this.store = this.base.createObjectStore(table.name, { keyPath: "name", autoIncrement: true });
        // autoIncrement : true => pas besoin de spécifier le name dans un "add"
        table.fields.forEach((field: DataField) => this.createField(field));
        table.rows.forEach((row: DataRow) => this.addRow(row));
    }
    createField(field: DataField) {
        let idbIndex: IDBIndex = this.store.createIndex(field.name, "name", { unique: false });
        console.log(`createField : ${idbIndex.objectStore.name}.${idbIndex.name} - Created.`, idbIndex);
    }
    addRow(row: DataRow) {
        let r: IDBRequest<IDBValidKey> = this.store.add(row.val);
        console.log(`store("${row.table.name}").addRow("${row.name}")`, r.readyState, r.error);
    }
    delRow(row: DataRow) {
        let r: IDBRequest = this.store.delete(row.name);
        console.log(`store("${row.table.name}").delRow("${row.name}")`, r.readyState, r.error);
    }
    putRow(row: DataRow) {
        let r: IDBRequest<IDBValidKey> = this.store.put(row.val);
        console.log(`store("${row.table.name}").putRow("${row.name}")`, r.readyState, r.error);
    }
    getRow(row: DataRow, callback: Function) {
        let r: IDBRequest<any> = this.store.get(row.val);
        console.log(`store("${row.table.name}").getRow("${row.name}")`, r.readyState, r.error);
        callback(r.result);
    }
    getAllRows(row: DataRow, callback: Function) {
        let r: IDBRequest<any> = this.store.getAll();
        console.log(`store("${row.table.name}").getAllRows("${row.name}")`, r.readyState, r.error);
        callback(r.result);
    }
    close() {
        this._base.close();
        console.log("Closing database", this.name);
    }
    deleteBase() {
        this.close();
        let r: IDBOpenDBRequest = indexedDB.deleteDatabase(this.name);
        console.log("Deleting database", this.name, " [version", this.version, "]", "State :", r.readyState, "Err :", r.error);
    }
}

enum FieldType {
    BOOL,
    TEXT,
    INT,
    NUM,
    DATE,
    BUFFER,
    NONE
}

abstract class DataField {
    static isBool = (s: any) => { return Boolean(s) == s; }
    static isText = (s: any) => { return typeof s == "string" };
    static isInt = (s: any) => { return Number.isInteger(s); };
    static isNum = (s: any) => { return Number.isFinite(s); };
    static isDate = (s: any) => { return s instanceof Date; };
    static isBuff = (s: any) => { return s instanceof ArrayBuffer; };
    fieldType: FieldType = FieldType.NONE;
    emptyValue: any;
    constructor(public table: DataTable, public test: (v: any) => boolean, public name: string, public description: string) {
        table.fields.set(this.name, this);
    }
    accepts(value: any): boolean {
        return this.test(value);// implémenter chez les enfants
    }
}

class FieldBool extends DataField {
    fieldType = FieldType.BOOL;
    emptyValue = false;
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isBool, name, description);
    }
}

class FieldText extends DataField {
    fieldType = FieldType.TEXT;
    emptyValue = "";
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isText, name, description);
    }
}

class FieldInt extends DataField {
    fieldType = FieldType.INT;
    emptyValue = 0;
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isInt, name, description);
    }
}

class FieldNum extends DataField {
    fieldType = FieldType.NUM;
    emptyValue = 0;
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isNum, name, description);
    }
}

class FieldDate extends DataField {
    fieldType = FieldType.DATE;
    emptyValue = new Date();
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isDate, name, description);
    }
}

class FieldBuffer extends DataField {
    fieldType = FieldType.BUFFER;
    emptyValue = new Uint8Array();
    constructor(table: DataTable, name: string, description: string) {
        super(table, DataField.isBuff, name, description);
    }
}

class DataColumn {
    constructor(public row: DataRow, public field: DataField, public value: any) {
        this.row.columns.set(field, this);
        if (!this.isValid) throw new TypeError(`Valeur "${this.value}" invalide (dans une colonne "${field.name}" de type${field.fieldType}`);
    }
    get isValid(): boolean {
        return this.field.accepts(this.value);
    }
}

class DataRow {
    columns: Map<DataField, DataColumn> = new Map();
    /**
     * Remplit une liste de valeurs dans une table (écrase une liste de même identifiant)
     * @param table DataTable à laquelle cette ligne de valeurs sera ajoutée
     * @param name  identifiant de la ligne de valeurs 
     * @param vals valeurs de la ligne de valeurs, dans l'ordre des champs de la table
     */
    constructor(public table: DataTable, public name: string, public vals: any[]) {
        let i = 0;
        this.table.fields.forEach((field: DataField) => {
            new DataColumn(this, field, vals[i++]);
        });
        table.rows.set(this.name, this);
    }
    /**
     * Remplace toutes les valeurs de la ligne par des valeurs vides
     */
    clear() {
        this.columns.forEach((c) => { c.value = c.field.emptyValue; })
    }
    /**
     * Renvoie l'une des colonnes de la ligne
     * @param fieldId identifiant de la colonne
     */
    column(fieldId: string): DataColumn {
        let field = this.table.field(fieldId);
        return this.columns.get(field) as DataColumn;
    }
    /**
     * Renvoie la valeur stockée dans une colonne de la ligne
     * @param fieldId identifiant du champ (la colonne) dont on veut la valeur
     */
    value(fieldId: string): any {
        return this.column(fieldId).value;
    }
    /**
     * Objet complet {"rowId": name, "field1_Id":val1, "field2_Id",val2...}
     */
    get val(): any {
        let o: any = {
            name: this.name
        };
        this.columns.forEach((c: DataColumn) => {
            o[c.field.name] = c.value;
        });
        return o;
    }
}

class DataTable {
    fields: Map<string, DataField> = new Map();
    rows: Map<string, DataRow> = new Map();
    /**
     * Initialise une table dans une base de données (écrase une table de même nom !)
     * @param base base de données à laquelle sera rattachée cette table
     * @param name identifiant de la table
     * @param description description de la table à créer
     */
    constructor(public base: DataBase, public name: string, public description: string) {
        base.tables.set(this.name, this);
    }
    /**
     * Crée une ligne de valeurs vides pour la table (à remplir dans un formulaire)
     */
    createEmpty(): DataRow | undefined {
        let name = window.prompt("Identifiant ?") as string;
        if (name == "") return undefined;
        let values: any[] = [];
        this.fields.forEach((field) => values.push(field.emptyValue));
        return new DataRow(this, name, values);
    }
    /**
     * Renvoie la liste des lignes qui la même valeur dans une colonne
     * @param fieldId colonne des valeurs à tester
     * @param value valeur désirée dans cette colonne
     */
    filterRows(fieldId: string, value: any): DataRow[] {
        let liste: DataRow[] = [];
        this.rows.forEach((row: DataRow) => {
            let val = row.value(fieldId);
            if (val == value) liste.push(row);
        });
        return liste;
    }
    /**
     * Renvoie la liste des valeurs d'une colonne pour un groupe de lignes qui ont une valeur en commun
     * @param fieldId identifiant de la colonne des valeurs communes
     * @param value valeur à retrouver dans la colonne de sélection
     * @param output identifiant de la colonne des valeurs désirées
     */
    filterRowsCol(fieldId: string, value: any, output: string): any[] {
        let liste: DataRow[] = [];
        this.rows.forEach((row: DataRow) => {
            if (row.value(fieldId) == value) {
                liste.push(row.value(output));
            }
        });
        return liste;
    }
    /**
     * Renvoie la liste des valeurs pour l'un des champs
     * @param fieldId champ dont on veut des valeurs
     */
    getValues(fieldId: string): any[] {
        let liste: any[] = [];
        this.rows.forEach((row: DataRow) => {
            liste.push(row.value(fieldId));
        });
        return liste;
    }
    /**
     * Ajoute une colonne de type 'booléen' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addBoolField(fieldId: string, description: string): FieldBool {
        return new FieldBool(this, fieldId, description);
    }
    /**
     * Ajoute une colonne de type 'texte' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addTextField(fieldId: string, description: string): FieldText {
        return new FieldText(this, fieldId, description);
    }
    /**
     * Ajoute une colonne de type 'nombre entier' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addIntField(fieldId: string, description: string): FieldInt {
        return new FieldInt(this, fieldId, description);
    }
    /**
     * Ajoute une colonne de type 'nombre décimal' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addNumField(fieldId: string, description: string): FieldNum {
        return new FieldNum(this, fieldId, description);
    }
    /**
     * Ajoute une colonne de type 'date' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addDateField(fieldId: string, description: string): FieldDate {
        return new FieldDate(this, fieldId, description);
    }
    /**
     * Ajoute une colonne de type 'données binaires' à cette table
     * @param fieldId identifiant de la colonne
     * @param description description du champ
     */
    addBufferField(fieldId: string, description: string): FieldBuffer {
        return new FieldBuffer(this, fieldId, description);
    }
    /**
     * Ajoute une suite de valeurs à la table
     * @param rowId identifiant de la ligne de données
     * @param vals valeurs dans l'ordre des colonnes
     */
    addRow(rowId: string, vals: any[]): DataRow {
        return new DataRow(this, rowId, vals);
    }
    /**
     * Supprime une ligne de données de la table
     * @param rowId 
     */
    removeRow(rowId: string): boolean {
        return this.rows.delete(rowId);
    }
    /**
     * Renvoie une colonne de la table  
     * @param fieldId identifiant du champ de données
     */
    field(fieldId: string): DataField {
        if (this.fields.has(fieldId)) {
            return this.fields.get(fieldId) as DataField;
        }
        throw new RangeError(`Le champ ${fieldId} n'existe pas dans la table ${this.name}.`);
    }
    /**
     * Renvoie une ligne de données retrouvée par son identifiant
     * @param rowId identifiant de la ligne de données 
     */
    row(rowId: string): DataRow {
        if (this.rows.has(rowId)) {
            return this.rows.get(rowId) as DataRow;
        }
        throw new RangeError(`La ligne ${rowId} n'existe pas dans la table ${this.name}.`);
    }
    /**
     * Nombre de colonnes dans cette DataTable
     */
    get numFields(): number {
        return this.fields.size;
    }
    /**
     * Nombre de lignes de données dans cette DataTable
     */
    get numRows(): number {
        return this.fields.size;
    }
}

class DataBase {
    /**
     * Liste des tables de la base
     */
    tables: Map<string, DataTable> = new Map();
    /**
     * Initialisation de la base de données 
     * @param name nom de la base de données
     * @param description description de la base de données
     */
    constructor(public name: string, public description: string) {

    }
    /**
     * Renvoie la valeur d'une colonne pour toutes les lignes qui ont une valeur en commun
     * @param fieldId identifiant du champ servant à identifier les valeurs communes
     * @param value valeur désirée pour le champ de filtre
     * @param output identifiant du champ dont on veut la valeur
     */
    filterRowsColumn(tableId: string, fieldId: string, value: any, output: string): any[] {
        return this.table(tableId).filterRowsCol(fieldId, value, output);
    }
    /**
     * Renvoie toutes les lignes d'une table qui ont une valeur en commun
     * @param tableId table dont on veut sélectionner des lignes
     * @param fieldId champ servant à identifier les valeurs à garder
     * @param value valeur désirée pour ce champ
     */
    filterRows(tableId: string, fieldId: string, value: any): DataRow[] {
        return this.table(tableId).filterRows(fieldId, value);
    }
    /**
     * Renvoie la liste des valeurs pour le champ d'une table
     * @param tableId table dont on veut une colonne de valeurs
     * @param fieldId champ dont on veut des valeurs
     */
    getValues(tableId: string, fieldId: string): any[] {
        return this.table(tableId).getValues(fieldId);
    }
    /**
     * Renvoie une table si elle existe sinon provoque une erreur
     * @param tableId identifiant de la table désirée
     */
    table(tableId: string): DataTable {
        if (this.tables.has(tableId)) {
            return this.tables.get(tableId) as DataTable;
        }
        throw new RangeError(`La table "${tableId}" n'existe pas dans la base "${this.name}".`);
    }
    /**
     * Renvoie une ligne de données si elle existe (sinon provoque une erreur)
     * @param tableId identifiant de la table
     * @param itemId identifiant de la ligne de données
     */
    row(tableId: string, itemId: string): DataRow {
        return this.table(tableId).row(itemId);
    }
    /**
     * Crée une table (ou écrase en créant une table de même identifiant)
     * @param tableId identifiant de la table
     * @param description description de la table
     */
    addTable(tableId: string, description: string): DataTable {
        return new DataTable(this, tableId, description);
    }
    /**
     * 
     * @param tableId identifiant de la table
     * @param rowId identifiant de la ligne de valeurs
     * @param vals suite de valeurs à mettre dans la ligne, dans l'ordre des champs
     */
    addRow(tableId: string, rowId: string, ...vals: any[]): DataRow {
        return new DataRow(this.table(tableId), rowId, vals);
    }
    /**
     * Supprime une DataTable de la DataBase
     * @param tableId identifiant de la table 
     */
    removeTable(tableId: string): boolean {
        return this.tables.delete(tableId);
    }
    /**
     * Supprime une DataRow d'une DataTable de la Base
     * @param tableId identifiant de la table
     * @param rowId identifiant de la ligne de valeurs
     */
    removeRow(tableId: string, rowId: string): boolean {
        return this.table(tableId).removeRow(rowId);
    }
    /**
     * Nombre de DataTables dans la DataBase
     */
    get numTables(): number {
        return this.tables.size;
    }
}

class DataBaseView {
    div: HTMLDivElement;
    constructor(db: DataBase, x: number, y: number, w: number, h: number) {
        this.div = this.createChild(document.body, "div", "white") as HTMLDivElement;
        this.div.style.width = "90%";
        this.div.style.margin = "auto";
        this.show(db)
    }
    show(db: DataBase) {
        this.createTitle(this.div, 3, db.name, " : ", db.description);
        db.tables.forEach((table: DataTable) => {
            this.createTitle(this.div, 4, table.name, ":", table.description);
            let tblEl = this.createChild(this.div, "table", "#999999") as HTMLTableElement;
            tblEl.style.width = "99%";
            tblEl.style.margin = "auto";
            table.rows.forEach((row: DataRow) => {
                this.createCells(db, table, row, tblEl);
            });
        });
    }
    createCells(db: DataBase, table: DataTable, row: DataRow, tblEl: HTMLTableElement): HTMLTableRowElement {
        let rowEl = this.createChild(tblEl, "tr", "#CCCCFF") as HTMLTableRowElement;
        rowEl.addEventListener("click", (e) => this.createForm(db, table, row, rowEl));
        let cell = this.createChild(rowEl, "td", "#FFCCFF") as HTMLTableCellElement;
        cell.style.width = "20%";
        cell.textContent = row.name;
        row.columns.forEach((col: DataColumn) => {
            cell = this.createChild(rowEl, "td", "#FFFFCC") as HTMLTableCellElement;
            cell.textContent = col.value;
        });
        return rowEl;
    }
    createForm(b: DataBase, t: DataTable, row: DataRow, re: HTMLTableRowElement) {
        let frm = this.createChild(this.div, "div", "white") as HTMLDivElement;
        this.createTitle(frm, 4, "Édition de la fiche :", row.name);
        frm.style.width = "99%";
        frm.style.margin = "auto";
        let tbl = this.createChild(frm, "table", "white");
        tbl.style.width = "100%";
        tbl.style.margin = "auto";
        row.columns.forEach((col: DataColumn) => {
            let r = this.createChild(tbl, "tr", "#666666") as HTMLTableRowElement;
            let valTitl = this.createChild(r, "td", "#777799") as HTMLTableCellElement;
            valTitl.textContent = col.field.name;
            let valCell = this.createChild(r, "td", "#777799") as HTMLTableCellElement;
            let input = this.createChild(valCell, "input") as HTMLInputElement;
            switch (col.field.fieldType) {
                case FieldType.BOOL: input.type = "checkbox"; break;
                case FieldType.TEXT: input.type = "text"; break;
                case FieldType.INT: input.type = "number"; break;
                case FieldType.NUM: input.type = "number"; break;
                case FieldType.DATE: input.type = "date"; break;
                case FieldType.BUFFER: input.type = "text"; break;
                default: input.type = "text";
            }
            input.style.width = "95%";
            input.value = col.value;
            if (input.type == "checkbox") input.checked = col.value;
            input.addEventListener("input", (fe) => {
                col.value = (input.type == "checkbox") ? input.checked : input.value;
                let index = r.rowIndex;
                let tblCell = re.cells.item(index + 1) as HTMLTableCellElement;
                tblCell.textContent = col.value;
            });
            let hlpCell = this.createChild(r, "td", "#777799") as HTMLTableCellElement;
            hlpCell.textContent = col.field.description;
        });
        this.actionBtn(frm, "Supprimer cette fiche", row, re);
        this.actionBtn(frm, "Vider cette fiche", row, re);
        this.actionBtn(frm, "Nouvelle fiche", row, re);

        window.document.addEventListener("mousedown", e => {
            let el = e.target as HTMLElement;
            if (frm.contains(el) || frm == el) return;
            if (this.div.contains(frm)) this.div.removeChild(frm);
        });
    }

    onButton(bText: string, frm: HTMLDivElement, row: DataRow, re: HTMLTableRowElement) {
        let table = row.table, db = table.base;
        switch (bText) {
            case "Supprimer cette fiche":
                table.removeRow(row.name);
                re.remove();
                if (this.div.contains(frm)) this.div.removeChild(frm);
                break;
            case "Vider cette fiche":
                row.clear();
                Array.from(re.cells).forEach((cell, i) => {
                    if (i > 0) cell.textContent = "";
                });
                break;
            case "Nouvelle fiche":
                let newrow = table.createEmpty();
                if (newrow) {
                    re = this.createCells(db, table, newrow, re.parentElement as HTMLTableElement);
                    if (this.div.contains(frm)) this.div.removeChild(frm);
                    this.createForm(db, table, newrow, re);
                }
                break;
        }
    }

    actionBtn(frm: HTMLDivElement, btnText: string, row: DataRow, re: HTMLTableRowElement) {
        let b = this.createChild(frm, "button") as HTMLButtonElement;
        b.textContent = btnText;
        b.addEventListener("click", e => this.onButton.call(this, btnText, frm, row, re));
        return b;
    }
    createChild(parent: HTMLElement, type: string, color: string = ""): HTMLElement {
        let el = document.createElement(type);
        parent.appendChild(el);
        if (color.length) el.style.backgroundColor = color;
        return el;
    }
    createTitle(target: HTMLElement, h: number, ...text: string[]) {
        let p = this.createChild(target, "h" + h, "#DDDDEE");
        p.style.margin = "2px";
        p.innerHTML = text.join(" ");
    }
    setPosAndSize(el: HTMLElement, x: number, y: number, w: number, h: number) {
        el.setAttribute("style", `position: absolute; left:${x}px; top:${y}px;`);
        if (w) el.style.width = w + "px";
        if (h) el.style.width = h + "px";
    }
}

function exemple() {

    var base = new DataBase("Programmes", "Programmes enregistrés et décrits");
    let tableAnnee = base.addTable("Année", "Une année de programmes stockés");
    tableAnnee.addIntField("num", "Numéro de l'année");
    tableAnnee.addTextField("description", "Description de l'année");
    tableAnnee.addBoolField("stockée", "L'année est-elle enregistrée ?");
    tableAnnee.addRow("2015", [2015, "Il y a quatre ans", false]);
    tableAnnee.addRow("2016", [2016, "Il y a trois ans", true]);
    tableAnnee.addRow("2017", [2017, "Il y a deux ans", true]);
    tableAnnee.addRow("2018", [2018, "L'année dernière", true]);
    tableAnnee.addRow("2019", [2019, "Cette année", false]);
    tableAnnee.addRow("2020", [2020, "l'année prochaine", false]);

    let tableMois = base.addTable("Mois", "Un mois de programmes");
    tableMois.addIntField("Année", "Année correspondant à ce mois");
    tableMois.addIntField("num", "numéro du mois (entre 1 et 12)");
    tableMois.addTextField("mois", "nom du mois en toutes lettres");
    tableMois.addBoolField("saisi", "Le mois a-t-il été saisi ?");
    tableMois.addRow("avril 2019", [2019, 4, "avril", false]);
    tableMois.addRow("mai 2019", [2019, 5, "mai", false]);
    tableMois.addRow("juin 2019", [2019, 6, "juin", false]);
    tableMois.addRow("juillet 2019", [2019, 7, "juillet", false]);
    tableMois.addRow("août 2019", [2019, 8, "août", false]);
    tableMois.addRow("septembre 2019", [2019, 9, "septembre", false]);

    new DataBaseView(base, 20, 20, 800, 600);
    console.log(base.numTables, base.description, base.table("Année").description)

    console.log("Années existantes :", base.getValues("Année", "num").join(", "));
    console.log("Numéros des années stockées :", base.filterRowsColumn("Année", "stockée", true, "num").join(", "));
    console.log("Numéros des années non stockées :", base.filterRowsColumn("Année", "stockée", false, "num").join(", "));
    console.log("J'ai stocké", base.filterRowsColumn("Année", "stockée", true, "description").join(", "));
    console.log("Je n'ai pas stocké", base.filterRowsColumn("Année", "stockée", false, "description").join(", "));
    console.log("Cette année est l'année", base.filterRows("Année", "description", "Cette année")[0].name);

    let idb = new IndexedDataBase(base);
    idb.openBase(); // créé si elle n'existe pas
}
