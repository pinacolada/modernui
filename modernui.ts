const BASIC = "#CCCCEE", LABEL = "#BBBBEE", LUMI = "#8888CC";
const EDVAL = "#FFFFCC", DECOBORD = "#666666";
class UiEl extends HTMLElement {
    eti!: UiEl;
    static observedAttributes = ["rec", "lbl"];
    constructor() {
        super();
    }
    /**
     * Définit le fond et la bordure
     * @param bgc couleur du fond
     * @param bdr bordure (épaisseur style couleur)
     */
    setColor(bgc: string, bdr: string) {
        this.bg = bgc;
        this.border = bdr;
    }
    attributeChangedCallback() {
        this.style.left = this.x + "px";
        this.style.top = this.y + "px";
        this.style.width = this.w + "px";
        this.style.height = this.h + "px";
    }
    attr(a: string): string {
        return this.getAttribute(a) + "";
    }
    createLabel() {
        let eti = new UiEl().with(this.attr("lbl"), this.x - 150, this.y, 148, this.h);
        eti.classList.add("lbl");
        this.parent.appendChild(eti);
        this.eti = eti;
        this.highlight(false);
    }
    highlight(y: boolean) {
        this.eti.setColor(y ? LABEL : LUMI, y ? "1px solid "+EDVAL : "1px solid "+DECOBORD);
    }
    with(txt: string, x: number, y: number, w: number, h: number) {
        this.txt = txt;
        this.rect = [x, y, w, h];
        return this;
    }
    /**
     * Identifiant du noeud html
     */
    get name(): string { return this.attr("id"); }
    /**
     * Noeud html parent
     */
    get parent(): HTMLElement { return this.parentElement as HTMLElement; }
    /**
     * Rectangle de délimitation ([x, y, width, height])
     */
    get rect(): number[] { return this.attr("rec").split(";").map(s => parseInt(s)); }
    set rect(value: number[]) { this.setAttribute("rec", value.join(";")); }
    get x(): number { return this.rect[0]; }
    get y(): number { return this.rect[1]; }
    get w(): number { return this.rect[2]; }
    get h(): number { return this.rect[3]; }
    get bg(): string { return this.style.backgroundColor || "" };
    set bg(value: string) { this.style.backgroundColor = value; }
    get border(): string { return this.style.border || "" };
    set border(value: string) { this.style.border = value; }
    get cursor(): string { return this.style.cursor || ""; }
    set cursor(value: string) { this.style.cursor = value; }
    get txt(): string { return this.textContent || ""; }
    set txt(value: string) { this.textContent = value; }
}

class UiGr extends UiEl {
    canvas!: HTMLCanvasElement;
    graphics!: CanvasRenderingContext2D;
    constructor() {
        super();
    }
    connectedCallback() {
        this.canvas = document.createElement("canvas");
        this.graphics = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        this.canvas.style.margin = "0";
        this.canvas.style.padding = "0";
        this.appendChild(this.canvas);
        this.canvas.style.pointerEvents = "none";
    }
    attributeChangedCallback() {
        super.attributeChangedCallback();
        if (this.canvas) {
            this.canvas.width = this.w;
            this.canvas.height = this.h;
        }
    }
    /**
     * Efface le dessin
     */
    clear() {
        this.graphics.clearRect(0, 0, this.w, this.h);
    }
    drawShape(bgColor: string, bdrColor: string, ...pts: number[]) {
        this.graphics.beginPath();
        this.graphics.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) this.graphics.lineTo(pts[i], pts[i + 1]);
        if (bgColor.length) { this.graphics.fillStyle = bgColor; this.graphics.fill(); };
        if (bdrColor.length) { this.graphics.strokeStyle = bdrColor; this.graphics.stroke(); }
    }
    drawRect(x: number, y: number, w: number, h: number, fill: string, bdr?: string) {
        if (fill.length) {
            this.graphics.fillStyle = fill;
            this.graphics.fillRect(x, y, w, h);
        }
        if (bdr) {
            this.graphics.strokeStyle = bdr;
            this.graphics.strokeRect(x, y, w, h);
        }
    }
}

class UiItm extends UiEl {
    super() { }
    connectedCallback() {
        this.bg = LABEL;
        this.style.borderLeft = "1px solid "+DECOBORD;
        this.style.borderRight = "1px solid black";
        this.style.borderBottom = "1px solid black";
        this.addEventListener("mouseover", () => this.bg = LUMI);
        this.addEventListener("mouseout", () => this.bg = LABEL);
    }
}

class UiBtn extends UiEl {
    constructor() {
        super();
    }
    get label(): string { return this.getAttribute("label") + ""; }
    connectedCallback() {
        this.setColor(BASIC, "2px outset #DDDDDD");
        this.onmouseover = () => this.bg = LUMI;
        this.onmouseout = () => this.bg = BASIC;
        this.onmousedown = () => this.setColor("#BBBBBB", "2px inset #DDDDDD");
        this.onmouseup = () => this.setColor(LUMI, "2px outset #DDDDDD");
        this.textContent = this.attr("lbl");
        let callback = Function(`${this.attr("cmd")}`);
        this.onclick = (e) => callback(e);
    }
}

class UiEd extends UiEl {
    constructor() {
        super();
        this.addEventListener("focus", this.onEditionStart);
        this.addEventListener("blur", this.onEditionEnd);
    }
    onEditionStart() {
        this.highlight(true);
        this.bg = EDVAL;
    }
    onEditionEnd() {
        this.highlight(false);
        this.bg = BASIC;
    }
    connectedCallback() {
        this.setAttribute("contenteditable", "true");
        this.spellcheck = false;
        this.createLabel();
        this.setColor(BASIC, "2px inset #DDDDDD");
    }
}

class UiOpt extends UiEl {
    items: UiItm[] = [];
    arrow!: UiGr;
    constructor() {
        super();
    }
    connectedCallback() {
        this.setAttribute("contenteditable", "true");
        this.spellcheck = false;
        this.addEventListener("focus", this.activeState);
        this.addEventListener("blur", this.normalState);
        this.border = "2px inset #DDDDDD";
        this.createLabel();
        this.arrow = new UiGr().with("", this.x + this.w - 25, this.y + 2, 24, this.h - 3);
        this.parent.appendChild(this.arrow);
        this.arrow.drawShape(EDVAL, DECOBORD, 4, 6, 18, 6, 11, 16, 4, 6);// flèche vers le bas
        this.arrow.addEventListener("mousedown", e => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            this.toogleState();
        });
        this.arrow.style.cursor = "pointer";
        this.normalState();
    }
    toogleState() {
        this.items.length ? this.normalState() : this.activeState();
    }
    normalState() {
        this.bg = BASIC;
        this.arrow.setColor(LABEL, "1px outset white");
        this.highlight(false);
        while (this.items.length) {
            this.parent.removeChild(this.items[0]);
            this.items.shift();
        }
    }
    activeState() {
        this.bg = EDVAL;
        this.arrow.border = "1px outset black";
        this.highlight(true);
        let opts = this.attr("opt");
        if (opts.startsWith("{") && opts.endsWith("}")) {
            let id = opts.substring(1, opts.length - 1);
            opts = window[id];// ça marche !
        }
        // crée la liste des entrées 
        opts.split(";").map((txt, i) => {
            let opt: UiItm = new UiItm().with(txt, this.x, this.y + this.h + (i * this.h), this.w, this.h + 1);
            this.parent.appendChild(opt);
            this.items.push(opt);
        });
        window.document.addEventListener("mousedown", (e) => {
            for (let i = 0; i < this.items.length; i++) {
                if (e.target == this.items[i]) this.txt = this.items[i].txt;
            }
            this.normalState();
        });
    }
}

class UiBol extends UiEl {
    check!: UiGr;
    constructor() {
        super();
        this.addEventListener("click", e => this.onChange());
    }
    onChange() {
        this.checked = !this.checked;
    }
    connectedCallback() {
        this.createLabel();
        this.style.cursor = "pointer";
        this.setColor(DECOBORD, "1px inset black");
        this.check = new UiGr();
        this.parent.appendChild(this.check);
        this.check.addEventListener("click", e => this.onChange());
        this.check.style.cursor = "pointer";
        this.check.setColor(BASIC, "1px outset white");
        this.checked = this.attr("checked") == "true";
    }
    get checked(): boolean {
        return this.attr("checked") == "true";
    }
    set checked(value: boolean) {
        this.setAttribute("checked", value ? "true" : "false");
        this.check.clear();
        let ux = this.w / 12, uy = this.h / 7;
        let [x1, x2, x3, x4, x5, y0, y1, y2, y3, y4, y5, y6] = [ux, ux * 2, ux * 3, ux * 4, ux * 5, 0, uy, uy * 2, uy * 3, uy * 4, uy * 5, uy * 5.8];
        if (value) {
            this.check.rect = [this.x + 1, this.y + 1, (this.w / 2), this.h - 3];
            this.check.drawShape("#66FF66", DECOBORD,
                x5, y0, x5, y1, x2, y6, x1, y4, x2, y5, x4, y1, x5, y0); // check vert
        } else {
            this.check.rect = [this.x + (this.w / 2)-2, this.y + 1, (this.w / 2), this.h - 3];
            this.check.drawShape("#FF6666", DECOBORD,
                x1, y2, x2, y1, x3, y2, x4, y1, x5, y2,
                x4, y3, x5, y4, x4, y5, x3, y4, x2, y5,
                x1, y4, x2, y3, x1, y2);// croix rouge
        }
    }
}

class UiCpt extends UiEl {
    decr!: UiGr;
    incr!: UiGr;
    rule!: UiGr;
    constructor() {
        super();
    }
    connectedCallback() {
        this.createLabel();
        this.setColor(BASIC, "1px outset #FFFFFF");
        let cpt = this;
        const rule = new UiGr().with("", this.x + this.w - 80, this.y + 2, 76, 15);
        rule.setColor(LUMI, "1px inset #FFFFFF");
        rule.cursor = "pointer";
        this.parent.appendChild(rule);

        showRuler(rule.x + (75 * cpt.pourcent));

        function showRuler(mx: number) {
            let [px, ht, pourcent] = [rule.x, rule.h-2, (mx - rule.x) / 75];
            rule.clear();
            rule.drawRect(0, 0, mx - px, ht, EDVAL);
            cpt.val = ((cpt.max - cpt.min) * pourcent) + cpt.min;
        }
        rule.addEventListener("wheel", (w: WheelEvent) => {
            let direction = w.deltaY / 3, precis = cpt.precis;
            cpt.val -= direction * 1 / Math.pow(10, precis);
            showRuler(rule.x + (75 * cpt.pourcent));
        });
        rule.addEventListener("mousedown", (e) => {
            rule.addEventListener("mousemove", onDrag);
            document.addEventListener("mouseup", onEndDrag);
            cpt.highlight(true);
            onDrag(e);
            function onDrag(e: MouseEvent) {
                showRuler(e.clientX);
            }
            function onEndDrag(e: MouseEvent) {
                cpt.highlight(false);
                rule.removeEventListener("mousemove", onDrag);
                document.removeEventListener("mouseup", onEndDrag);
            }
        });
        this.rule = rule;
    }
    get precis(): number { return parseInt(this.attr("precis")); }
    set precis(value: number) { this.setAttribute("precis", value.toFixed(0)); }
    get min(): number { return parseFloat(this.attr("min")); }
    get max(): number { return parseFloat(this.attr("max")); }
    get pourcent(): number { return (this.val - this.min) / (this.max - this.min); }
    get val(): number { return parseFloat(this.attr("val")); }
    set val(v: number) {
        v = (v < this.min ? this.min : v > this.max ? this.max : v);
        let vtxt = v.toFixed(this.precis);
        this.setAttribute("val", vtxt);
        this.txt = vtxt;
    }
}

window.customElements.define("ui-el", UiEl);
window.customElements.define("ui-gr", UiGr);
window.customElements.define("ui-itm", UiItm);
window.customElements.define("ui-btn", UiBtn);
window.customElements.define("ui-ed", UiEd);
window.customElements.define("ui-opt", UiOpt);
window.customElements.define("ui-bol", UiBol);
window.customElements.define("ui-cpt", UiCpt);