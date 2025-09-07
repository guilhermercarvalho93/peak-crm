let cards = JSON.parse(localStorage.getItem("cards")) || [];
let editingCardId = null;

// Renderiza os cards em cada coluna
function renderCards() {
  document.querySelectorAll(".cards").forEach(c => c.innerHTML = "");
  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "card";
    div.draggable = true;
    div.dataset.id = card.id;
    div.innerHTML = `
      <strong>${card.nome}</strong>
      <small>CNPJ: ${card.cnpj || "-"}</small><br>
      <small>Ticket: ${card.ticket || "-"}</small><br>
      <small>Cidade: ${card.cidade || "-"}</small><br>
      <small>Tel: ${card.telefone || "-"}</small>
    `;
    div.addEventListener("click", () => openModal(card.id));
    div.addEventListener("dragstart", dragStart);
    document.getElementById(card.status).appendChild(div);
  });
  localStorage.setItem("cards", JSON.stringify(cards));
}

// Drag & Drop
function dragStart(e) { e.dataTransfer.setData("id", e.target.dataset.id); }
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", e => e.preventDefault());
  col.addEventListener("drop", e => {
    const id = e.dataTransfer.getData("id");
    const card = cards.find(c => c.id == id);
    card.status = col.dataset.status;
    renderCards();
  });
});

// Modal
const modal = document.getElementById("modal");
document.getElementById("addCardBtn").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", () => closeModal());

function openModal(id=null) {
  modal.classList.remove("hidden");
  editingCardId = id;
  if(id){
    const card = cards.find(c => c.id == id);
    document.getElementById("nome").value = card.nome;
    document.getElementById("cnpj").value = card.cnpj;
    document.getElementById("ticket").value = card.ticket;
    document.getElementById("cidade").value = card.cidade;
    document.getElementById("telefone").value = card.telefone;
  } else {
    document.getElementById("cardForm").reset();
  }
}
function closeModal(){ modal.classList.add("hidden"); }

// CRUD
document.getElementById("cardForm").addEventListener("submit", e => {
  e.preventDefault();
  const novoCard = {
    id: editingCardId || Date.now(),
    nome: document.getElementById("nome").value,
    cnpj: document.getElementById("cnpj").value,
    ticket: document.getElementById("ticket").value,
    cidade: document.getElementById("cidade").value,
    telefone: document.getElementById("telefone").value,
    status: editingCardId ? cards.find(c => c.id == editingCardId).status : "novo"
  };
  if(editingCardId){
    cards = cards.map(c => c.id == editingCardId ? novoCard : c);
  } else {
    cards.push(novoCard);
  }
  closeModal();
  renderCards();
});

document.getElementById("deleteCard").addEventListener("click", () => {
  if(editingCardId){
    cards = cards.filter(c => c.id != editingCardId);
    closeModal();
    renderCards();
  }
});

renderCards();

