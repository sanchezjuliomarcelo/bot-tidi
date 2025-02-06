/*********************************************************
 * app.js
 *********************************************************/

// 1. Variables globales
let botFlows = {};     // Aquí se cargará el contenido de flows.json
let currentFlow = "";  // Almacena el flujo/pantalla actual

// 2. Referencias al DOM
const chatWindow = document.getElementById("chat-window");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

/**
 * Función para insertar mensajes en el chat.
 * @param {string} sender - 'bot' o 'user'.
 * @param {string} text - El texto a mostrar.
 * 
 * Esta versión parsea las líneas del mensaje,
 * detecta cuales lucen como opciones ("A. Opción", "1. Opción", etc.)
 * y las mete en una lista <ul>.
 */
function appendMessage(sender, text) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(sender === "bot" ? "bot-message" : "user-message");

  // Separamos el texto en líneas usando \n
  const lines = text.split("\n");

  let htmlContent = "";
  let listItems = [];

  // Regex para detectar líneas del estilo "A. Opción" o "1. Opción":
  // - ^  : inicio de la línea
  // - [A-Za-z0-9] : una letra o un dígito
  // - \.  : un punto
  // - \s? : cero o un espacio
  // - .+  : resto del contenido (la opción)
  const optionRegex = /^[A-Za-z0-9]\.\s?.+/;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      // Si la línea está vacía, agregamos un <br> para no dejar todo junto
      htmlContent += "<br>";
      return;
    }

    // Si coincide con la forma "A. Opción" / "1. Opción"
    if (optionRegex.test(trimmed)) {
      // Guardamos como <li>
      listItems.push(`<li>${trimmed}</li>`);
    } else {
      // Texto normal => envolvemos en <p>
      htmlContent += `<p>${trimmed}</p>`;
    }
  });

  // Si tenemos ítems de lista, los agrupamos en <ul>
  if (listItems.length > 0) {
    htmlContent += `<ul>${listItems.join("")}</ul>`;
  }

  msgDiv.innerHTML = htmlContent;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight; // auto-scroll
}

/**
 * Maneja el input del usuario, navega en botFlows según la opción.
 */
function handleUserInput() {
  const input = userInput.value.trim();
  if (!input) return;

  // Mostramos en pantalla el mensaje del usuario
  appendMessage("user", input);

  const flowConfig = botFlows[currentFlow];
  
  // Verificamos si el flow actual tiene opciones definidas
  if (flowConfig.options) {
    const nextFlowKey = flowConfig.options[input];
  
    if (nextFlowKey && botFlows[nextFlowKey]) {
      // Hay transición al siguiente flow
      currentFlow = nextFlowKey;
      appendMessage("bot", botFlows[currentFlow].message);
    } else {
      // No hay opción definida para ese input
      // 1) Ver si no hay ninguna "opción" => input libre
      if (Object.keys(flowConfig.options).length === 0) {
        // Este flujo no espera opciones (ej: pidiendo # de orden o algo libre).
        // Podemos responder algo genérico o devolver al menú principal.
        appendMessage("bot", "Gracias por la información. Regresando al Menú Principal...");
        currentFlow = "menuPrincipal";
        appendMessage("bot", botFlows[currentFlow].message);
      } else {
        // Caso: hay opciones definidas, pero el input no coincide => error genérico
        appendMessage("bot", "No entendí esa opción. Por favor, intenta de nuevo.");
      }
    }
  } else {
    // Si por alguna razón el flow actual ni siquiera tiene 'options'
    // Redireccionamos al menú principal
    appendMessage("bot", "No hay opciones para este flujo. Volvemos al Menú Principal...");
    currentFlow = "menuPrincipal";
    appendMessage("bot", botFlows[currentFlow].message);
  }

  userInput.value = "";
}

/**
 * Al cargar la página, hacemos fetch de flows.json y guardamos el contenido en botFlows.
 * Luego iniciamos en el flow "menuPrincipal".
 */
fetch("flows.json")
  .then(response => response.json())
  .then(data => {
    botFlows = data;
    currentFlow = "menuPrincipal";
    // Mostramos el primer mensaje
    appendMessage("bot", botFlows[currentFlow].message);
  })
  .catch(error => {
    console.error("Error al cargar flows.json:", error);
    appendMessage("bot", "Lo siento, hubo un error al cargar el flujo de conversación.");
  });

// Listeners para el botón y la tecla Enter
sendBtn.addEventListener("click", handleUserInput);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserInput();
  }
});
