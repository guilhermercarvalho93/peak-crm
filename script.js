/**********************

* UTIL & STORAGE

**********************/

const LS_USERS = "peak_users";
const LS_SESSION = "peak_session";
const LS_CARDS_PREFIX = "peak_cards_"; // por usuário

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function getUsers(){
  return JSON.parse(localStorage.getItem(LS_USERS)) || [];
}

function setUsers(arr){
  localStorage.setItem(LS_USERS, JSON.stringify(arr));
}

function sessionUser(){
  const email = localStorage.getItem(LS_SESSION);
  if(!email) return null;
  return getUsers().find(u => u.email === email) || null;
}

function setSession(email){
  localStorage.setItem(LS_SESSION, email);
}

function clearSession(){
  localStorage.removeItem(LS_SESSION);
}

/** Hash de senha (SHA-256, Web Crypto) */
async function hash(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

/** Cards por usuário */
function cardsKey(email){ return `${LS_CARDS_PREFIX}${email}`; }

function getCards(){
  const user = sessionUser();
  if(!user) return [];
  return JSON.parse(localStorage.getItem(cardsKey(user.email))) || [];
}

function setCards(cards){
  const user = sessionUser();
  if(!user) return;
  localStorage.setItem(cardsKey(user.email), JSON.stringify(cards));
}

/**********************

* AUTENTICAÇÃO (SPA)

**********************/

const auth = $("#auth");
const app = $("#app");
const appHeader = $("#appHeader");
const authMsg = $("#authMsg");
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const forgotForm = $("#forgotForm");

$("#showRegister").onclick = () => swapAuth("register");
$("#showLoginFromReg").onclick = () => swapAuth("login");
$("#showForgot").onclick = () => swapAuth("forgot");
$("#showLoginFromForgot").onclick = () => swapAuth("login");

function swapAuth(view){
  authMsg.textContent = "";
  loginForm.classList.toggle("hidden", view !== "login");
  registerForm.classList.toggle("hidden", view !== "register");
  forgotForm.classList.toggle("hidden", view !== "forgot");
}

async function doLogin(email, pass){
  const users = getUsers();
  const u = users.find(x => x.email === email.toLowerCase().trim());
  if(!u) throw new Error("Usuário não encontrado.");
  const h = await hash(pass);
  if(h !== u.pass) throw new Error("Senha incorreta.");
  setSession(u.email);
}

function requireAuthUI(){
  const user = sessionUser();
  if(user){
    document.body.classList.remove("login-bg");
    document.body.classList.add("app-bg");
    // mostra app
    app.classList.remove("hidden");
    appHeader.classList.remove("hidden");
    auth.classList.add("hidden");
    $("#userWelcome").textContent = `Olá, ${user.name}`;
    renderCards();
  } else {
    document.body.classList.add("login-bg");
    document.body.classList.remove("app-bg");
    // mostra login
    app.classList.add("hidden");
    appHeader.classList.add("hidden");
    auth.classList.remove("hidden");
    swapAuth("login");
  }
}

/** Submits */
loginForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  try {
    const email = $("#loginEmail").value;
    const pass = $("#loginPass").value;
    await doLogin(email, pass);
    requireAuthUI();
  } catch(err) {
    authMsg.textContent = err.message || "Falha ao entrar.";
  }
});

registerForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  try {
    const name = $("#regName").value.trim();
    const email = $("#regEmail").value.toLowerCase().trim();
    const pass = $("#regPass").value;
    const users = getUsers();
    if(users.some(u => u.email === email)){
      authMsg.textContent = "E-mail já cadastrado.";
      return;
    }
    const h = await hash(pass);
    users.push({ id: Date.now(), name, email, pass: h });
    setUsers(users);
    setSession(email);
    // cria storage inicial de cards para o novo usuário
    setCards([]);
    requireAuthUI();
  } catch {
    authMsg.textContent = "Erro ao criar conta.";
  }
});

forgotForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = $("#forgotEmail").value.toLowerCase().trim();
  const newPass = $("#forgotNewPass").value;
  const users = getUsers();
  const idx = users.findIndex(u => u.email === email);
  if(idx < 0){
    authMsg.textContent = "E-mail não encontrado.";
    return;
  }
  users[idx].pass = await hash(newPass);
  setUsers(users);
  authMsg.textContent = "Senha redefinida! Faça login.";
  swapAuth("login");
});

/** Logout */
$("#logoutBtn").addEventListener("click", ()=>{
  clearSession();
  requireAuthUI();
});

/**********************

* KANBAN + CRUD

**********************/

let cards = []; // cache em memória do usuário logado
let editingCardId = null;

function syncFromStorage(){
  cards = getCards();
}

function syncToStorage(){
  setCards(cards);
}

function renderCards(){
  syncFromStorage();
  $$(".cards").forEach(c => c.innerHTML = "");
  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "card";
    div.draggable = true;
    div.dataset.id = card.id;
    div.innerHTML = `
    <strong>${card.nome}</strong><br>
    <small>CNPJ: ${card.cnpj || "-"}</small><br>
    <small>Ticket: ${card.ticket || "-"}</small><br>
    <small>Cidade: ${card.cidade || "-"}</small><br>
    <small>Tel: ${card.telefone || "-"}</small>
  `;
    div.addEventListener("click", () => openModal(card.id));
    div.addEventListener("dragstart", dragStart);
    const col = document.querySelector(`.column[data-status="${card.status}"] .cards`);
    if(col) col.appendChild(div);
  });
  syncToStorage();
}

// Drag & Drop
function dragStart(e){
  e.dataTransfer.setData("cardId", e.target.dataset.id);
}

$$(".column .cards").forEach(cardsEl => {
  cardsEl.addEventListener("dragover", e => e.preventDefault());
  cardsEl.addEventListener("drop", e => {
    e.preventDefault();
    const id = e.dataTransfer.getData("cardId");
    const card = cards.find(c => String(c.id) === String(id));
    if(card){
      const col = e.currentTarget.parentElement;
      card.status = col.dataset.status;
      syncToStorage();
      renderCards();
    }
  });
});

// Modal
const modal = $("#modal");

$("#addCardBtn").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", () => closeModal());

function openModal(id=null){
  modal.classList.remove("hidden");
  editingCardId = id;
  $("#modalTitle").textContent = id ? "Editar Cliente" : "Novo Cliente";
  if(id){
    const card = cards.find(c => String(c.id) === String(id));
    $("#nome").value = card.nome || "";
    $("#cnpj").value = card.cnpj || "";
    $("#ticket").value = card.ticket || "";
    $("#cidade").value = card.cidade || "";
    $("#telefone").value = card.telefone || "";
  } else {
    $("#cardForm").reset();
  }
}

function closeModal(){ modal.classList.add("hidden"); }

// CRUD
$("#cardForm").addEventListener("submit", e => {
  const novoCard = {
    id: editingCardId || Date.now(),
    nome: $("#nome").value,
    cnpj: $("#cnpj").value,
    ticket: $("#ticket").value,
    cidade: $("#cidade").value,
    telefone: $("#telefone").value,
    status: editingCardId
      ? (cards.find(c => String(c.id) === String(editingCardId))?.status || "cliente-novo")
      : "cliente-novo"
  };
  if(editingCardId){
    cards = cards.map(c => String(c.id) === String(editingCardId) ? novoCard : c);
  } else {
    cards.push(novoCard);
  }
  syncToStorage();
  closeModal();
  renderCards();
});

$("#deleteCard").addEventListener("click", () => {
  if(editingCardId){
    cards = cards.filter(c => String(c.id) !== String(editingCardId));
    syncToStorage();
    closeModal();
    renderCards();
  }
});

/**********************

* BOOT

**********************/
document.addEventListener("DOMContentLoaded", () => {
  requireAuthUI(); // mostra login ou app conforme sessão
});