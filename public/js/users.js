import { supabase, checkAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await checkAuth();
    if (!auth) return;

    if (auth.profile.role !== 'admin') {
        alert('Access denied: Admins only');
        window.location.href = 'index.html';
        return;
    }

    loadUsers();

    // Invite Modal
    const modal = document.getElementById('invite-modal');
    const close = document.getElementsByClassName('modal-close')[0];
    const inviteForm = document.getElementById('invite-form');

    document.getElementById('invite-btn').addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    close.addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('invite-msg').textContent = '';
    });

    inviteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('invite-email').value;
        const role = document.getElementById('invite-role').value;
        const msg = document.getElementById('invite-msg');

        msg.textContent = 'Sending invite...';
        msg.style.color = '#666';

        try {
            console.log(`Inviting ${email} as ${role}`);

            // In a real scenario, we'd fetch POST /functions/v1/invite-user
            // For now, we'll just mock success to show UI flow
            msg.textContent = 'Invitation sent! (Mock)';
            msg.style.color = 'var(--success)';

            setTimeout(() => {
                modal.style.display = 'none';
                inviteForm.reset();
            }, 1000);

        } catch (error) {
            msg.textContent = error.message;
            msg.style.color = 'var(--danger)';
        }
    });

    // Attach global window functions for inline events
    window.updateRole = async function (userId, newRole) {
        if (!confirm(`Change role to ${newRole}?`)) {
            loadUsers(); // revert UI
            return;
        }

        try {
            const { error } = await supabase
                .from('admin_users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            // Success notification?
        } catch (error) {
            alert('Error updating role: ' + error.message);
            loadUsers();
        }
    };

    window.toggleStatus = async function (userId, currentStatus) {
        const newStatus = !currentStatus;
        const action = newStatus ? 'Activate' : 'Deactivate';

        if (!confirm(`${action} this user?`)) return;

        try {
            const { error } = await supabase
                .from('admin_users')
                .update({ is_active: newStatus })
                .eq('id', userId);

            if (error) throw error;
            loadUsers();

        } catch (error) {
            alert('Error updating status: ' + error.message);
        }
    };
});

async function loadUsers() {
    const tbody = document.getElementById('users-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';

    try {
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>
                    <select onchange="window.updateRole('${user.id}', this.value)" ${user.email === 'admin@yardguard.com' ? 'disabled' : ''}>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="reviewer" ${user.role === 'reviewer' ? 'selected' : ''}>Reviewer</option>
                    </select>
                </td>
                <td>
                     <span class="badge ${user.is_active ? 'badge-approved' : 'badge-rejected'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                    <button class="btn btn-sm ${user.is_active ? 'btn-danger' : 'btn-primary'}" 
                            onclick="window.toggleStatus('${user.id}', ${user.is_active})">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Error: ${error.message}</td></tr>`;
    }
}
