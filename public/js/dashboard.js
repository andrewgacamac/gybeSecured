
import { supabase, checkAuth, logout } from './auth.js';

console.log('DASHBOARD MODULE START (Secure v2)');

const PER_PAGE = 10;
let currentPage = 1;
let currentStatus = 'ALL';

export async function initDashboard() {
    console.log('Initializing Dashboard...');

    // Setup UI Event Listeners
    setupEventListeners();

    // Initial Load
    await loadLeads();
}

function setupEventListeners() {
    // Status Filter
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect) {
        statusSelect.value = currentStatus;
        statusSelect.addEventListener('change', (e) => {
            currentStatus = e.target.value;
            currentPage = 1;
            loadLeads();
        });
    }

    // Pagination
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadLeads();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            loadLeads();
        });
    }

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadLeads();
        });
    }
}

async function loadLeads() {
    const tbody = document.getElementById('leads-body');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>';

    try {
        console.log('Fetching leads with status:', currentStatus);

        // Build Query
        let query = supabase
            .from('leads')
            .select(`
                *,
                photos (count)
            `, { count: 'exact' });

        if (currentStatus !== 'ALL') {
            query = query.eq('status', currentStatus);
        }

        const start = (currentPage - 1) * PER_PAGE;
        const end = start + PER_PAGE - 1;

        const { data: leads, count, error } = await query
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) throw error;

        console.log('Leads fetched:', leads?.length, 'Total:', count);

        if (tbody) {
            tbody.innerHTML = '';
            if (!leads || leads.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No leads found. (Status: ${currentStatus})</td></tr>`;
            } else {
                leads.forEach(lead => {
                    const tr = document.createElement('tr');
                    const createdDate = new Date(lead.created_at).toLocaleDateString();
                    const createdTime = new Date(lead.created_at).toLocaleTimeString();
                    const updatedDate = new Date(lead.updated_at).toLocaleDateString();

                    // Calculate photo count safely
                    let photoCount = 0;
                    if (lead.photos && Array.isArray(lead.photos)) {
                        photoCount = lead.photos[0]?.count || 0;
                    } else if (lead.photos?.count) {
                        photoCount = lead.photos.count;
                    }

                    const statusClass = (lead.status || 'new').toLowerCase().replace('_', '-');

                    tr.innerHTML = `
                        <td>${createdDate} <small style="color:#666">${createdTime}</small></td>
                        <td>
                            <div style="font-weight: 500;">${lead.first_name || ''} ${lead.last_name || ''}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${lead.email || ''}</div>
                        </td>
                        <td>${photoCount}</td>
                        <td><span class="badge badge-${statusClass}">${lead.status || 'NEW'}</span></td>
                        <td>${updatedDate}</td>
                        <td>
                            <a href="lead.html?id=${lead.id}" class="btn btn-primary">View</a>
                            <button class="btn btn-danger delete-btn" data-id="${lead.id}" style="margin-left: 8px; background-color: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Add Delete Listeners
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const id = e.target.dataset.id;
                        if (!confirm('Are you sure you want to delete this lead PERMANENTLY?')) return;

                        e.target.innerText = '...';
                        e.target.disabled = true;

                        try {
                            const { error } = await supabase.functions.invoke('admin-delete-lead', {
                                body: { lead_id: id }
                            });

                            if (error) throw error;

                            alert('Lead deleted.');
                            loadLeads(); // Refresh table
                        } catch (err) {
                            console.error('Delete failed:', err);
                            alert('Failed to delete: ' + err.message);
                            e.target.innerText = 'Delete';
                            e.target.disabled = false;
                        }
                    });
                });
            }
        }

        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(count / PER_PAGE) || 1}`;
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage >= Math.ceil(count / PER_PAGE);

    } catch (error) {
        console.error('Error loading leads:', error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
}
