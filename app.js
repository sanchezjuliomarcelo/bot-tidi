// Variables globales
let botFlows = {};
let currentFlow = "";

// Referencias al DOM
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

/**
 * Función para insertar mensajes en el chat.
 * @param {string} sender - 'bot' o 'user'.
 * @param {string} text - El texto a mostrar.
 */
function appendMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");

  // Separamos el texto en líneas
  const lines = text.split("\n");

  let htmlContent = "";
  let listItems = [];

  // Regex para detectar opciones tipo "A. Opción" o "1. Opción"
  const optionRegex = /^[A-Za-z0-9]\.\s?.+/;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      htmlContent += "<br>";
      return;
    }

    if (optionRegex.test(trimmed)) {
      listItems.push(`<li>${trimmed}</li>`);
    } else {
      htmlContent += `<p>${trimmed}</p>`;
    }
  });

  if (listItems.length > 0) {
    htmlContent += `<ul>${listItems.join("")}</ul>`;
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Maneja el input del usuario y la navegación entre flujos.
 */
function handleUserInput() {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);

  const flowConfig = botFlows[currentFlow];
  if (flowConfig.options) {
    const nextFlowKey = flowConfig.options[input];

    if (nextFlowKey && botFlows[nextFlowKey]) {
      currentFlow = nextFlowKey;
      appendMessage("bot", botFlows[currentFlow].message);
    } else {
      appendMessage("bot", "No entendí esa opción. Por favor, intenta de nuevo.");
    }
  } else {
    appendMessage("bot", "Regresando al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  }

  userInput.value = "";
}

// Cargar `flows.json`
fetch("flows.json")
  .then(response => response.json())
  .then(data => {
    botFlows = data;
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  })
  .catch(error => {
    console.error("Error al cargar flows.json:", error);
    appendMessage("bot", "Hubo un error al cargar la conversación.");
  });

// Eventos
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
