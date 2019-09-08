
const JOUR_DIFF = (date: Date, offset: number): Date => {
    let d = new Date(date);
    d.setDate(date.getDate() + offset);
    return d;
}

class Heure {
    public salle: string = "";
    public classe: string = "";
    public activite: string = "";
    static hid = ["M0", "M1", "M2", "M3", "M4", "S1", "S2", "S3", "S4"];
    static htp = ["", "8h25-9h20", "9h20-10h15", "10h35-11h30", "11h30-12h25", "13h-13h55", "14h-14h55", "14h55-15h50", "16h05-17h"];
    constructor(public jour: Jour, public num: number) {
        this.jour.heures.push(this);
    }
    planifier(classe: string, salle: string, activite: string = "") {
        this.salle = salle;
        this.classe = classe;
        this.activite = activite;
    }
    get info():string {
        return `${Heure.hid[this.num]} ${Heure.htp[this.num]}\n${this.classe} ${this.salle} ${this.activite}`;
    }
    /**
     * Année scolaire
     */
    get annee(): AnneeScolaire { return this.jour.annee; }
    /**
     * Trimestre
     */
    get trimestre(): Trimestre { return this.jour.trimestre; }
    /**
     * Mois
     */
    get mois(): Mois { return this.jour.mois; }
    /**
     * Semaine
     */
    get semaine(): Semaine { return this.jour.semaine; }
    /**
     * Est-ce une semaine A ?
     */
    get semaineA(): boolean { return this.jour.semaineA };
    /**
     * Est-ce une semaine B ?
     */
    get semaineB(): boolean { return this.jour.semaineB };
}

class Jour {
    heures: Heure[] = [];
    chome: JourChome | undefined = undefined;
    static noms = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    /**
     * Définit un jour de l'année
     * @param annee Année scolaire
     * @param semaine Semaine scolaire
     * @param date date du jour 
     * @param rangSemaine numéro entre 1 (lundi) et 7 (dimanche) du jour dans la semaine
     */
    constructor(public annee: AnneeScolaire, public semaine: Semaine, public date: Date, public rangSemaine: number) {
        this.annee.jours.push(this);
    }
    creerHeures() {
        for (let h = 0; h < 9; h++) new Heure(this, h);
    }
    get info(): string {
        return `${this.nom} ${this.numJour} ${this.mois.nom} ${this.numAn} - ${this.chome ? this.chome.raison : this.semaineA ? "Sem. A": "Sem. B"}`;
    }
    /**
     * Est-ce le bon jour ?
     * @param j date du jour dans le calendrier
     * @param m numéro du mois dans le calendrier
     * @param a numéro de l'année dans le calendrier
     */
    is(j: number, m: number, a: number): boolean {
        return (this.numJour == j) && (this.numMois == m) && (this.numAn == a);
    }
    planifier(numHeure: number, classe: string, salle: string, activite: string = "") {
        this.heures[numHeure].planifier(classe, salle, activite);
    }
    /**
     * Nom du jour de la semaine en toutes lettres
     */
    get nom(): string { return Jour.noms[this.rangSemaine]; }
    /**
     * Numéro du jour dans le mois (date, entre 1 et 31) 
     */
    get numJour(): number { return this.date.getDate() }
    /**
     * Numéro du mois dans l'année (entre 1 et 12)
     */
    get numMois(): number { return this.date.getMonth() + 1; }
    /**
     * Millésime de l'année 
     */
    get numAn(): number { return this.date.getFullYear();}
    /**
     * Mois de l'AnnéeScolaire
     */
    get mois(): Mois { return this.annee.moisAvec(this.date) as Mois; }
    /**
     * Trimestre de l'AnnéeScolaire
     */
    get trimestre(): Trimestre { return this.annee.trimestreAvec(this.date) as Trimestre; }
    /**
     * Est-ce un jour de semaine A ?
     */
    get semaineA(): boolean { return this.semaine.semaineA };
    /**
     * Est-ce un jour de semaine B ?
     */
    get semaineB(): boolean { return this.semaine.semaineB };
    /**
     * Est-ce un jour ouvré (de travail) ? 
     */
    get ouvre(): boolean {
        return this.chome == undefined;
    }
}

class Semaine {
    _semA: boolean = false;
    /**
     * Date de la fin de la semaine (dimanche)
     */
    fin: Date;
    /**
     * 
     * @param annee Année scolaire
     * @param debut date du début de la semaine (lundi)
     */
    constructor(public annee: AnneeScolaire, public debut: Date) {
        this.annee.semaines.push(this);
        this.semaineA = this.annee.semaines.indexOf(this) % 2 == 0;
        this.fin = new Date(debut); this.fin.setDate(debut.getDate() + 6);
        for (let numJour = 0; numJour < 7; numJour++) {
            new Jour(annee, this, JOUR_DIFF(debut, numJour), numJour + 1);
        }
        console.log(this.info);
    }
    get info(): string {
        return `Semaine du ${this.debut.getDate()} ${this.mois.nom} - ${this.semaineA ? "Semaine A" : "Semaine B"} (${this.trimestre.nom})`;
    }
    /**
     * Trimestre correspondant à cette semaine
     */
    get trimestre(): Trimestre { return this.annee.trimestreAvec(this.debut) as Trimestre; }
    /**
     * Mois dans lequel commence cette semaine
     */
    get mois(): Mois { return this.annee.moisAvec(this.debut) as Mois; }
    /**
     * Est-ce une semaine A ?
     */
    get semaineA(): boolean { return this._semA; }
    set semaineA(value: boolean) { this._semA = value; }
    /**
     * Est-ce une semaine B ?
     */
    get semaineB(): boolean { return !this._semA; }
    set semaineB(value: boolean) { this._semA = !value; }
    /**
     * Liste des jours de la semaine
     */
    get jours(): Jour[] {
        return this.annee.jours.filter(j => j.date >= this.debut && j.date <= this.fin);
    }
}

class Mois {
    static nom = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
    /**
     * Mois de l'année / de l'AnneeScolaire
     * @param annee AnnéeScolaire
     * @param nom nom du mois
     * @param num numéro normal du mois (entre 1 et 12)
     * @param debut date de début du mois
     * @param fin date de fin du mois
     */
    constructor(public annee: AnneeScolaire, public nom: string, public num: number, public debut: Date, public fin: Date) {
        this.annee.mois.push(this);
        console.log("Mois de", this.nom, this.an, "créé (", this.num, ")", debut.toDateString(), "->", fin.toDateString());
    }
    /**
     * Le Jour testé appartient-t-il à ce Mois ?
     * @param j jour à tester
     */
    contient(j: Jour) {
        return this.debut <= j.date && this.fin <= j.date;
    }
    /**
     * Numéro de l'année
     */
    get an(): number { return this.debut.getFullYear(); }
    /**
     * Liste des jours du mois
     */
    get jours(): Jour[] {
        return this.annee.jours.filter(j => j.date >= this.debut && j.date <= this.fin);
    }
    /**
     * Nombre de jours ouvrés
     */
    get joursOuvres(): number {
        return this.jours.filter(j => j.ouvre).length;
    }

}

class Trimestre {
    constructor(public annee: AnneeScolaire, public nom: string, public num: number, public debut: Date, public fin: Date) {
        this.annee.trimestres.push(this);
        console.log(this.nom, "créé", debut.toDateString(), fin.toDateString());
        
        for (let d = debut; d < fin; d = JOUR_DIFF(d, 7)) {
            if (this.annee.moisAvec(d) == undefined) {
                let a = d.getFullYear(), m = d.getMonth(), finMois = JOUR_DIFF(new Date(a, m + 1, 1), -1);
                new Mois(annee, Mois.nom[m], m + 1, new Date(a, m, 1), finMois);
            }
        }
        console.log(this.nom, ": Mois créés.");
    }
}

class AnneeScolaire {
    anFin: number;
    trimestres: Trimestre[] = [];
    mois: Mois[] = [];
    jours: Jour[] = [];
    semaines: Semaine[] = [];
    /**
     *  Crée et remplit le calendrier de dates
     * @param anDebut année de début en chiffres (2020, 2021, ...)
     * @param t1 date du lundi de début du premier trimestre
     * @param t2 date du lundi de début du deuxième trimestre
     * @param t3 date du lundi de début du troisièmre trimestre
     * @param t3f date du lundi de début du troisièmre trimestre
     * @param fin date de fin d'année 
     */
    constructor(public anDebut: number, t1: Date, t2: Date, t3: Date, fin: Date) {
        this.anFin = anDebut + 1;
        new Trimestre(this, "Premier trimestre", 1, t1, JOUR_DIFF(t2, -1));
        new Trimestre(this, "Second trimestre", 2, t2, JOUR_DIFF(t3, -1));
        new Trimestre(this, "Troisième trimestre", 3, t3, fin);
        for (var j = t1; j < fin; j = JOUR_DIFF(j, 7)) {
            new Semaine(this, j);
        }
    }

    trimestreAvec(d: Date): Trimestre | undefined {
        return this.trimestres.find(t => t.debut <= d && t.fin >= d);
    }
    moisAvec(d: Date): Mois | undefined {
        return this.mois.find(m => m.debut <= d && m.fin >= d);
    }
}

class Planning {
    annee: AnneeScolaire;
    plages: PlageHoraire[] = [];
    chomes: JourChome[] = [];
    constructor(an: AnneeScolaire) {
        this.annee = an;
    }
    /**
     * Définit l'activité de l'heure dans une journée ouvrée classique
     * @param jour numéro du jour (1 = lundi ... 5 = vendredi)
     * @param heure heure du jour (1:M1|4:M4|5:S1|8:S4)
     * @param classe nom de la classe
     * @param queA que la semaine A ?
     * @param queB que la semaine B ?
     * @param activite activité hebdomadaire programmée sur cette plage horaire
     * @param salle numéro de la salle de classe
     */
    planifier(jour: number, heure: number, classe: string, queA: boolean = false, queB: boolean = false, activite: string = "", salle: string = "C201") {
        new PlageHoraire(this, jour, heure, classe, queA, queB, activite, salle).appliquer(this.annee);
    }
    chomer(raison: string, jour: number, mois: number, an: number) {
        new JourChome(this, jour, mois, an, raison).appliquer();
    }
    vacances(raison: string, j1: number, m1: number, an1: number, j2: number, m2: number, an2: number) {
        let debut = new Date(an1, m1 - 1, j1), fin = new Date(an2, m2 - 1, j2);
        for (var j = debut; j <= fin; j = JOUR_DIFF(j, 1)) {
            this.chomer(raison, j.getDate(), j.getMonth() + 1, j.getFullYear());
        }
    }
    creerFinSemaines() {
        annee.jours.filter(j => j.ouvre && j.rangSemaine > 5)
            .forEach(j => this.chomer("week-end", j.numJour, j.numMois, j.numAn));
    }
}

class JourChome {
    date: Date;
    /**
     * Jour sans travail 
     * @param planning Planning contenant ce jour sans travail
     * @param numJour numéro du jour dans le mois (entre 1 et 31) 
     * @param numMois numéro du mois dans l'année (entre 1 et 12)
     * @param numAn numéro de l'année 
     * @param raison pourquoi ce jour est-il chômé ?
     */
    constructor(public planning: Planning, public numJour: number, public numMois: number, public numAn: number, public raison: string) {
        this.date = new Date(numAn, numMois - 1, numJour);
        this.planning.chomes.push(this);
    }
    appliquer() {
        let j = this.planning.annee.jours.find(j => j.is(this.numJour, this.numMois, this.numAn));
        if (j == undefined) {
            throw new RangeError(`Le ${this.numJour}/${this.numMois}/${this.numAn} n'est pas dans l'année ${annee.anDebut}`);
        }
        if (j.ouvre) j.chome = this;// ne touche pas aux jours déjà chomés (quand on fait une plage)
    }
}

class PlageHoraire {
    /**
     * 
     * @param planning Planning dans lequel on entre la plage horaire
     * @param jourNum numéro du jour (1 = lundi ... 5 = vendredi)
     * @param heureNum heure du jour (1:M1|4:M4|5:S1|8:S4)
     * @param classe nom de la classe
     * @param queA que la semaine A ?
     * @param queB que la semaine B ?
     * @param activite activité hebdomadaire programmée sur cette plage horaire
     * @param salle numéro de la salle de classe
     */
    constructor(
        public planning: Planning,
        public jourNum: number,
        public heureNum: number,
        public classe: string,
        public queA: boolean = false,
        public queB: boolean = false,
        public activite: string = "",
        public salle: string = "C201") {

        this.planning.plages.push(this);
    }
    appliquer(annee: AnneeScolaire) {
        let jours = annee.jours.filter(j => j.rangSemaine == this.jourNum && j.ouvre);
        if (this.queA) jours = jours.filter(j => j.semaineA == true);
        if (this.queB) jours = jours.filter(j => j.semaineB == true);
        jours.forEach(j => {
            j.creerHeures();// on ne crée les heures que pour les jours ouvrés
            j.planifier(this.heureNum, this.classe, this.salle, this.activite);
        }); 
    }
}

let trim1 = new Date(2019, 8, 2),
    trim2 = new Date(2019, 10, 25),//25 novembre -> 6 décembre (semaine des conseils)
    trim3 = new Date(2020, 2, 16),// 16 mars -> 27 mars (semaine des conseils 2ème trim)
    finAnnee = new Date(2020, 5, 28);

let annee = new AnneeScolaire(2019, trim1, trim2, trim3, finAnnee);
let p = new Planning(annee);

p.chomer("Toussaint", 1, 11, 2019);
p.chomer("Armistice 1918", 11, 11, 2019);
p.chomer("Noël", 25, 12, 2019);
p.chomer("Jour de l'an", 1, 1, 2020);
p.chomer("Pâques", 12, 3, 2020);
p.chomer("Lundi de Pâques", 13, 3, 2020);
p.chomer("Fête du travail", 1, 5, 2020);
p.chomer("Victoire 1945", 8, 5, 2020);
p.chomer("Ascension", 21, 5, 2020);
p.chomer("Pont de l'Ascension", 22, 5, 2020);
p.chomer("Pentecôte", 31, 5, 2020);
p.chomer("Lundi de Pentecôte", 1, 6, 2020);
p.vacances("Vacances de la Toussaint", 19, 10, 2019, 3, 11, 2019);
p.vacances("Vacances de Noël", 21, 12, 2019, 5, 1, 2020);
p.vacances("Vacances d'hiver", 8, 2, 2020, 23, 2, 2020);
p.vacances("Vacances de printemps", 4, 4, 2020, 19, 4, 2020);

p.creerFinSemaines();

p.planifier(1, 3, "3ème 2", false, false, "", "C102");
p.planifier(1, 6, "4ème 2", false, false, "", "C102");
p.planifier(1, 7, "5ème 2", false, false, "", "C102");
p.planifier(1, 8, "5ème 6", false, true, "", "C102");
p.planifier(2, 1, "5ème 6", false, false, "", "C102");
p.planifier(2, 2, "3ème 2", false, false, "", "C102");
p.planifier(2, 3, "3ème 2 G2", true, false, "", "C102");
p.planifier(2, 4, "3ème 2 G1", true, false, "", "C102");
p.planifier(2, 6, "4ème 2", false, false, "", "C102");
p.planifier(2, 7, "5ème 6", false, false, "", "C102");
p.planifier(2, 8, "5ème 2", false, true, "", "C102");
p.planifier(4, 1, "5ème 2", false, false, "", "C102");
p.planifier(4, 4, "3ème 2", false, true, "", "C102");
p.planifier(4, 4, "4ème 2", true, false, "", "C102");
p.planifier(4, 6, "5ème 6", false, false, "", "C102");
p.planifier(4, 7, "5ème 2", false, false, "", "C102");
p.planifier(5, 1, "5ème 6", true, false, "", "C102");
p.planifier(5, 1, "4ème 2", false, true, "Vie de classe", "C102");
p.planifier(5, 2, "5ème 6", false, false, "", "C102");
p.planifier(5, 3, "4ème 2", false, false, "", "C102");
p.planifier(5, 4, "4ème 2", false, false, "", "C102");
p.planifier(5, 6, "3ème 2", false, false, "", "C102");
p.planifier(5, 7, "5ème 2", false, false, "", "C102");

annee.jours.forEach(j => {
    console.log(j.info);
})