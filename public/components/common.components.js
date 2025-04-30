import './common/btn-simple.component.js';
import './common/tools.component.js';
import './common/footer.component.js';
import './common/navbar.component.js';
import './common/log.component.js';
import { ThemeUI } from '../ui/theme.ui.js';
import { GlobalDelegator } from '../ui/delegators/global.delegator.js';
import { Form } from '../utils/form.js';
import { Windows } from '../utils/windows.js';
import { Sliders } from '../utils/sliders.js';
import { Log } from '../utils/log.js';

document.addEventListener('DOMContentLoaded', async () => {
    // QrCodeDisplay.init();
    /**
     * Delegazione Eventi Globali
     */
    GlobalDelegator.init();
    Form.init();
    Sliders.init();
    Windows.init();
    Log.init();
    await ThemeUI.init();
});