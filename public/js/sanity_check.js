
// Simple debug script
(function () {
    const debugConsole = document.getElementById('debug-console');
    function log(msg) {
        if (!debugConsole) return;
        debugConsole.style.display = 'block';
        const line = document.createElement('div');
        line.style.color = '#ffff00';
        line.textContent = `[SanityCheck] ${msg}`;
        debugConsole.appendChild(line);
    }
    log('sanity_check.js loaded successfully.');
    if (window.supabase) {
        log('window.supabase is defined.');
    } else {
        log('window.supabase is NOT defined.');
    }
})();
