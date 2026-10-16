const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const statusDisplay = document.getElementById("status");
const historyList = document.getElementById("historyList");

let expression = "";
let justCalculated = false;
let history = [];

// Safe arithmetic parser
function calculate(input) {
  const tokens = input.match(
    /\d*\.?\d+|[()+\-*/]/g
  );

  if (!tokens || tokens.join("") !== input.replace(/\s/g, "")) {
    throw new Error("Invalid expression");
  }

  let pos = 0;

  function primary() {
    const token = tokens[pos++];

    if (token === "(") {
      const value = addSub();
      if (tokens[pos++] !== ")") {
        throw new Error("Missing bracket");
      }
      return value;
    }

    if (token === "+") return primary();
    if (token === "-") return -primary();

    if (token === undefined || !/^\d*\.?\d+$/.test(token)) {
      throw new Error("Invalid number");
    }

    const number = Number(token);
    if (!Number.isFinite(number)) throw new Error("Invalid number");
    return number;
  }

  function mulDiv() {
    let value = primary();

    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const operator = tokens[pos++];
      const right = primary();

      if (operator === "/" && right === 0) {
        throw new Error("Division by zero");
      }

      value = operator === "*" ? value * right : value / right;
    }

    return value;
  }

  function addSub() {
    let value = mulDiv();

    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const operator = tokens[pos++];
      const right = mulDiv();

      value = operator === "+" ? value + right : value - right;
    }

    return value;
  }

  const answer = addSub();

  if (pos !== tokens.length || !Number.isFinite(answer)) {
    throw new Error("Invalid calculation");
  }

  return Number(answer.toPrecision(12));
}

function normalize(input) {
  return input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
}

function format(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 10
  }).format(value);
}

function updateDisplay() {
  expressionDisplay.textContent = expression || "0";

  if (!expression) {
    resultDisplay.textContent = "0";
    statusDisplay.textContent = "READY";
    return;
  }

  try {
    const answer = calculate(normalize(expression));
    resultDisplay.textContent = format(answer);
    statusDisplay.textContent = "PREVIEW";
  } catch {
    resultDisplay.textContent = "—";
    statusDisplay.textContent = "INPUT";
  }
}

function addValue(value) {
  if (justCalculated && /[\d.(]/.test(value)) {
    expression = "";
  }

  justCalculated = false;

  const last = expression.slice(-1);

  // Avoid consecutive decimal points in the same number
  if (value === ".") {
    const currentNumber = expression.split(/[+\-×÷()]/).pop();
    if (currentNumber.includes(".")) return;
    if (!currentNumber) value = "0.";
  }

  // Replace an existing operator when another is entered
  if (/[+×÷−]/.test(value) && /[+×÷−]$/.test(expression)) {
    expression = expression.slice(0, -1);
  }

  // Prevent multiple decimal points after an operator
  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = "";
  justCalculated = false;
  updateDisplay();
}

function deleteLast() {
  expression = expression.slice(0, -1);
  justCalculated = false;
  updateDisplay();
}

function applyPercent() {
  // Convert the final number to a decimal percentage.
  const match = expression.match(/\d*\.?\d+$/);

  if (!match) return;

  const start = match.index;
  const number = Number(match[0]) / 100;

  expression =
    expression.slice(0, start) + String(number);

  justCalculated = false;
  updateDisplay();
}

function saveHistory(original, answer) {
  history.unshift({ original, answer });
  history = history.slice(0, 6);
  renderHistory();
}

function renderHistory() {
  historyList.replaceChildren();

  if (!history.length) {
    const item = document.createElement("li");
    item.className = "empty";
    item.textContent = "Your calculations will appear here.";
    historyList.appendChild(item);
    return;
  }

  history.forEach(({ original, answer }) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const equation = document.createElement("span");
    equation.textContent = original + " =";

    const value = document.createElement("strong");
    value.textContent = format(answer);

    item.append(equation, value);
    historyList.appendChild(item);
  });
}

function calculateResult() {
  if (!expression) return;

  try {
    const original = expression;
    const answer = calculate(normalize(expression));

    saveHistory(original, answer);
    expression = String(answer);
    justCalculated = true;

    expressionDisplay.textContent = original + " =";
    resultDisplay.textContent = format(answer);
    statusDisplay.textContent = "SUCCESS";
  } catch (error) {
    resultDisplay.textContent =
      error.message === "Division by zero"
        ? "Cannot divide by zero"
        : "Invalid expression";

    statusDisplay.textContent = "ERROR";
    justCalculated = false;
  }
}

// Button interactions
document.querySelector(".keypad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === "clear") clearAll();
  else if (action === "delete") deleteLast();
  else if (action === "percent") applyPercent();
  else if (action === "calculate") calculateResult();
  else if (value !== undefined) addValue(value);
});

// Keyboard support
document.addEventListener("keydown", (event) => {
  const key = event.key;

  if (/^\d$/.test(key) || key === "." || key === "(" || key === ")") {
    addValue(key);
  } else if (key === "+") {
    addValue("+");
  } else if (key === "-") {
    addValue("−");
  } else if (key === "*") {
    addValue("×");
  } else if (key === "/") {
    event.preventDefault();
    addValue("÷");
  } else if (key === "%") {
    applyPercent();
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculateResult();
  } else if (key === "Backspace") {
    deleteLast();
  } else if (key === "Escape") {
    clearAll();
  }
});

// Clear history
document.getElementById("clearHistory").addEventListener("click", () => {
  history = [];
  renderHistory();
});

// Dark / light theme
document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  document.getElementById("themeBtn").textContent = isLight ? "☾" : "☼";
  document.getElementById("themeBtn").setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme"
  );
});

updateDisplay();
renderHistory();
