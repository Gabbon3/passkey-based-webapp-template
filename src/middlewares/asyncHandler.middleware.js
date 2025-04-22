/**
 * Funzione usata per racchiudere tutti i metodi `controller`
 * che cattura tutti gli errori e li passa al middleware di gestione degli errori
 * @param {Function} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}