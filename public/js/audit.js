import { supabase, checkAuth } from './auth.js';

let currentPage = 1;
const PER_PAGE = 20;

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAuth();
    if (!auth) return;

    if (auth.profile.role !== 'admin') {
        alert('Access denied: Admins only');
        window.location.href = 'index.html';
        return;
    }

    loadAuditLog();

    document.getElementById('filter-btn').addEventListener('click', () => {
        currentPage = 1;
        loadAuditLog();
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadAuditLog();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        loadAuditLog();
    });
});

async function loadAuditLog() {
    const tbody = document.getElementById('audit-body');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

    try {
        let query = supabase
            .from('audit_log')
            .select(`
                *,
                admin_users (email)
            `, { count: 'exact' });

        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;

        if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
        if (dateTo) query = query.lte('created_at', new Date(dateTo).toISOString());

        const start = (currentPage - 1) * PER_PAGE;
        const end = start + PER_PAGE - 1;

        const { data: logs, count, error } = await query
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No logs found</td></tr>';
        } else {
            logs.forEach(log => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(log.created_at).toLocaleString()}</td>
                    <td>${log.admin_users?.email || 'System'}</td>
                    <td>${log.action}</td>
                    <td>${log.entity_type} (${log.entity_id || '-'})</td>
                    <td><pre style="margin: 0; font-size: 11px;">${JSON.stringify(log.details, null, 2)}</pre></td>
                `;
                tbody.appendChild(tr);
            });
        }

        const totalPages = Math.ceil((count || 0) / PER_PAGE);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;

    } catch (error) {
        console.error('Error loading audit log:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
    }
}
