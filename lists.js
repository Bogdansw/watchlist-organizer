const createListBtn = document.getElementById('create-list-btn');

if (createListBtn) {
  createListBtn.addEventListener('click', () => {
    createListBtn.blur();
  });
}
