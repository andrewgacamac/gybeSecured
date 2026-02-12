
import { supabase } from './auth.js?v=105';

console.log('RESET MODULE START (Client-Side v205)');

export function setupReset() {
    // Expose global function for the button to call
    window.adminResetDatabase = async function () {
        const resetBtn = document.getElementById('reset-db-btn');

        setTimeout(async () => {
            if (confirm('CONFIRM RESET: This will DELETE ALL leads and photos from the database. Are you sure?')) {
                try {
                    if (resetBtn) {
                        resetBtn.textContent = 'Clearing Tables...';
                        resetBtn.style.backgroundColor = '#991b1b'; // Darker red
                        resetBtn.disabled = true;
                    }

                    console.log('Starting Client-Side Factory Reset...');

                    // 1. Delete Photos (Foreign Key Child)
                    console.log('Deleting Photos...');
                    const { error: pError } = await supabase
                        .from('photos')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete ALL UUIDs

                    if (pError) throw pError;

                    // 2. Delete Leads (Foreign Key Parent)
                    console.log('Deleting Leads...');
                    const { error: lError } = await supabase
                        .from('leads')
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete ALL UUIDs

                    if (lError) throw lError;

                    if (resetBtn) resetBtn.textContent = 'Success!';
                    alert('SUCCESS: Database has been reset.');
                    window.location.reload();

                } catch (err) {
                    console.error('Reset Error:', err);
                    alert('Error: ' + err.message);
                    if (resetBtn) {
                        resetBtn.textContent = 'Reset DB';
                        resetBtn.style.backgroundColor = '#ef4444';
                        resetBtn.disabled = false;
                    }
                }
            } else {
                // Cancelled
                if (resetBtn) resetBtn.textContent = 'Reset DB';
            }
        }, 50);
    };

    console.log('Reset Logic Loaded. window.adminResetDatabase is ready (Client-Side Mode).');
}
