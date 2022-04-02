import {addWord, removeWord, hasWord} from './utils.js';

class SharePlaceGroup {
    constructor(elementsList, attachedStyleClass, attachedAsDisable=true) {
        this._attached = attachedStyleClass;
        this._asDisable = attachedAsDisable;
        this.elements = new Set(elementsList);
        this.currentElement = null;
       
    }

    disableAll(includeCurrent=false) {
        this.elements.forEach(el => {
            if(this.currentElement == el && !includeCurrent) {
                return;
            } else {
                this._disable(el);
            }
        });
    }

    updateTo(el) {
        if(!this.elements.has(el)) {
            throw Error("SharePlaceGroup has no element ", el);
        }

        if(this.currentElement == el) {
            return;
        }

        if(this.currentElement) {
            this._disable(this.currentElement);
        }

        this._enable(el);
        this.currentElement = el;
    }

    _enable(el) {
        if(hasWord(this._attached, el.className)) {
            if(this._asDisable) {
                el.className = removeWord(this._attached, el.className);
            }
        } else {
            if(!this._asDisable) {
                el.className = addWord(this._attached, el.className);
            }
        }
    }

    _disable(el) {
        if(hasWord(this._attached, el.className)) {
            if(!this._asDisable) {
                el.className = removeWord(this._attached, el.className);
            }
        } else {
            if(this._asDisable) {
                el.className = addWord(this._attached, el.className);
            }
        }
    }


}

export {
    SharePlaceGroup
}