const Sortable = window.Sortable;

export function initSortableSidebar() {
  try {
    const el = document.getElementById('sidebar-nav-list');
    if (el) {
      Sortable.create(el, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        forceFallback: false
      });
    }
  } catch (err) {
    console.warn("SortableJS initialization failed:", err);
  }
}

export function initResizeSidebar() {
  const sidebar = document.getElementById('custom-sidebar');
  const resizer = document.getElementById('sidebar-resizer');
  const mainLayout = document.getElementById('main-layout');
  if (!sidebar || !resizer || !mainLayout) return;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    resizer.classList.add('resizing');
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });

  function handleMouseMove(e) {
    let newWidth = e.clientX;
    if (newWidth < 78) newWidth = 78;
    if (newWidth > 450) newWidth = 450;

    sidebar.style.width = newWidth + 'px';
    mainLayout.style.marginLeft = newWidth + 'px';

    if (newWidth < 160) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }

  function handleMouseUp() {
    resizer.classList.remove('resizing');
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
}
