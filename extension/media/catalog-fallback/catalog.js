/* global acquireVsCodeApi */
const vscode = acquireVsCodeApi();
const catalogUrl = document.body.dataset.catalogUrl || '';

let skills = [];

async function load() {
  if (!catalogUrl) return;
  const res = await fetch(catalogUrl);
  const data = await res.json();
  skills = data.skills || [];
  render();
}

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const t = document.getElementById('type').value;
  const list = document.getElementById('list');
  const filtered = skills.filter((s) => {
    if (t && (s.moduleType || 'skill') !== t) return false;
    if (!q) return true;
    const blob = `${s.id} ${s.skillFolder} ${s.description}`.toLowerCase();
    return blob.includes(q);
  });
  list.innerHTML = filtered.length ? '' : '<p class="muted">No matches</p>';
  for (const s of filtered.slice(0, 80)) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<strong>${s.skillFolder}</strong> <span class="muted">${s.moduleType || 'skill'}</span><p>${s.description || ''}</p>`;
    const add = document.createElement('button');
    add.textContent = 'Add to spec';
    add.onclick = () => vscode.postMessage({ type: 'add', id: s.id });
    const copy = document.createElement('button');
    copy.textContent = 'Copy id';
    copy.onclick = () => vscode.postMessage({ type: 'copy', text: s.id });
    div.appendChild(add);
    div.appendChild(copy);
    list.appendChild(div);
  }
}

document.getElementById('q').addEventListener('input', render);
document.getElementById('type').addEventListener('change', render);
window.addEventListener('message', (e) => {
  if (e.data?.type === 'toast') {
    const toast = document.getElementById('toast');
    toast.textContent = e.data.text;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }
});

void load();
