/* =========================================
   TASKFLOW — TASK MANAGEMENT
   ========================================= */

"use strict";

// ELEMENTS
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskList = document.getElementById("task-list");

const totalCount = document.getElementById("total-count");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");

const progressLabel = document.getElementById("progress-label");
const progressTrack = document.getElementById("progress-track");
const progressFill = document.getElementById("progress-fill");

const visibleCount = document.getElementById("visible-count");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyDescription = document.getElementById("empty-description");
const footerSummary = document.getElementById("footer-summary");
const clearCompletedButton = document.getElementById("clear-completed");
const dateLabel = document.getElementById("today-date");
const filterButtons = document.querySelectorAll("[data-filter]");

const STORAGE_KEY = "taskflow-tasks-v1";

let currentFilter = "all";
let tasks = loadTasks();

// DATE
function displayToday() {
  const today = new Date();

  dateLabel.textContent = today.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).toUpperCase();
}

// LOAD SAVED TASKS
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);

    if (!savedTasks) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks.filter((task) => {
      return (
        task &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean" &&
        typeof task.createdAt === "string"
      );
    });
  } catch (error) {
    console.warn("No se pudieron cargar las tareas guardadas.", error);
    return [];
  }
}

// SAVE TASKS
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar las tareas.", error);
    footerSummary.textContent =
      "No se han podido guardar los cambios en este navegador.";
    return false;
  }
}

// CREATE A TASK
function addTask(text) {
  const cleanText = text.trim();

  if (!cleanText) {
    taskInput.focus();
    return;
  }

  if (cleanText.length > 120) {
    return;
  }

  const task = {
    id: createTaskId(),
    text: cleanText,
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveTasks();

  currentFilter = "all";
  updateActiveFilter();
  render();

  taskInput.value = "";
  taskInput.focus();
}

// CREATE A UNIQUE TASK ID
function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// TOGGLE COMPLETION
function toggleTask(taskId) {
  tasks = tasks.map((task) => {
    if (task.id === taskId) {
      return {
        ...task,
        completed: !task.completed
      };
    }

    return task;
  });

  saveTasks();
  render();
}

// DELETE A TASK
function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);

  saveTasks();
  render();
}

// CLEAR COMPLETED TASKS
function clearCompletedTasks() {
  tasks = tasks.filter((task) => !task.completed);

  saveTasks();
  render();
}

// CHANGE FILTER
function updateActiveFilter() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

// GET TASKS FOR THE SELECTED FILTER
function getVisibleTasks() {
  if (currentFilter === "pending") {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

// FORMAT TASK CREATION TIME
function formatTaskDate(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Tarea guardada";
  }

  return `Añadida el ${date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short"
  })}`;
}

// BUILD A TASK ELEMENT
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "task-item";

  if (task.completed) {
    item.classList.add("completed");
  }

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "task-toggle";
  toggleButton.setAttribute(
    "aria-label",
    task.completed ? "Marcar como pendiente" : "Marcar como completada"
  );
  toggleButton.setAttribute("aria-pressed", String(task.completed));

  const checkmark = document.createElement("span");
  checkmark.setAttribute("aria-hidden", "true");
  checkmark.textContent = task.completed ? "✓" : "";

  toggleButton.appendChild(checkmark);
  toggleButton.addEventListener("click", () => {
    toggleTask(task.id);
  });

  const taskCopy = document.createElement("div");
  taskCopy.className = "task-copy";

  const taskText = document.createElement("div");
  taskText.textContent = task.text;

  const taskTime = document.createElement("span");
  taskTime.className = "task-time";
  taskTime.textContent = formatTaskDate(task.createdAt);

  taskCopy.append(taskText, taskTime);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.setAttribute("aria-label", `Eliminar tarea: ${task.text}`);
  deleteButton.title = "Eliminar tarea";
  deleteButton.textContent = "×";

  deleteButton.addEventListener("click", () => {
    deleteTask(task.id);
  });

  item.append(toggleButton, taskCopy, deleteButton);

  return item;
}

// UPDATE STATISTICS
function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;

  const percentage = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  completedCount.textContent = completed;

  progressLabel.textContent = `${percentage}%`;
  progressFill.style.width = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", String(percentage));

  const visible = getVisibleTasks().length;

  visibleCount.textContent =
    `${visible} ${visible === 1 ? "tarea" : "tareas"}`;

  clearCompletedButton.hidden = completed === 0;

  if (total === 0) {
    footerSummary.textContent = "Todo listo para empezar.";
  } else if (pending === 0) {
    footerSummary.textContent = "¡Has completado todas tus tareas!";
  } else {
    footerSummary.textContent =
      `${pending} ${pending === 1 ? "tarea pendiente" : "tareas pendientes"}`;
  }
}

// EMPTY STATE MESSAGES
function updateEmptyState(visibleTasks) {
  if (visibleTasks.length > 0) {
    emptyState.hidden = true;
    return;
  }

  emptyState.hidden = false;

  if (currentFilter === "pending" && tasks.length > 0) {
    emptyTitle.textContent = "Todo al día";
    emptyDescription.textContent =
      "No tienes tareas pendientes. Buen trabajo.";
  } else if (currentFilter === "completed" && tasks.length > 0) {
    emptyTitle.textContent = "Aún no hay tareas completadas";
    emptyDescription.textContent =
      "Cuando completes una tarea, aparecerá aquí.";
  } else if (tasks.length > 0) {
    emptyTitle.textContent = "Lista vacía";
    emptyDescription.textContent =
      "No hay tareas que mostrar con este filtro.";
  } else {
    emptyTitle.textContent = "Todo empieza aquí";
    emptyDescription.textContent =
      "Añade tu primera tarea y empieza a organizar tu día.";
  }
}

// RENDER THE APP
function render() {
  const visibleTasks = getVisibleTasks();

  taskList.replaceChildren();

  visibleTasks.forEach((task) => {
    taskList.appendChild(createTaskElement(task));
  });

  updateStatistics();
  updateEmptyState(visibleTasks);
}

// FORM SUBMISSION
taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(taskInput.value);
});

// FILTER BUTTONS
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateActiveFilter();
    render();
  });
});

// CLEAR COMPLETED BUTTON
clearCompletedButton.addEventListener("click", clearCompletedTasks);

// START APPLICATION
displayToday();
updateActiveFilter();
render();