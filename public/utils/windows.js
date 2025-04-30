export class Windows {
    static current = null;
    static bc = null;
    static loaderElement = null;
    /**
     * 
     */
    static init() {
        this.bc = document.getElementById('modal-backdrop');
        this.bc.addEventListener('click', () => {
            Windows.close();
        });
        // ---
        this.loaderElement = document.querySelector('#loader');
        this.loaderElement.addEventListener('dblclick', () => {
            this.loaderElement.classList.remove('show');
        });
    }
    /**
     * Apre una finestra nel document
     * @param {String} target id della finestra html
     */
    static open(target) {
        // -- chiudo il precedente
        this.close(this.current);
        const div = document.getElementById(target);
        if (!div) return;
        this.current = target;
        // ---
        div.classList.add('show');
        this.bc.setAttribute('data-target', target);
        this.bc.classList.add('show');
    }
    /**
     * Chiude una finestra nel document
     * @param {String} target id della finestra html
     */
    static close(target = this.current) {
        if (!target) return;
        document.getElementById(target).classList.remove('show');
        this.bc.classList.remove('show');
    }
    /**
     * schermata di caricamento
     * @param {boolean} active
     */
    static loader(active) {
        if (active) {
            this.loaderElement.classList.add('show');
        } else {
            this.loaderElement.classList.remove('show');
        }
    }
}

// window.Windows = Windows;