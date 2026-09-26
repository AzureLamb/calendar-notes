let calendarContentElement
let calendarTitleElement
let textEditAreaElement
let pastMonthButton
let futureMonthButton
let notAssignedElement

let now = new Date();
let current_selected_year = now.getFullYear();
let current_selected_month = now.getMonth();

let noteIndexer = {};
let loadedNote = null;
let cloudState = null;

let is_unsaved = false;
let autosave_start;
const AUTOSAVE_TOLERANCE = 1500;

const MONTHS_STRINGS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function autosave_counter(timestamp) {
    if (autosave_start == null) {
        autosave_start = timestamp;
    }
    const elapsed = timestamp - autosave_start;
    if (elapsed >= AUTOSAVE_TOLERANCE) {
        autosave();
    } else {
        requestAnimationFrame(autosave_counter);
    }
}

async function autosave() {
    autosave_start = null;
    is_unsaved = false;
    if (loadedNote != null && cloudState != textEditAreaElement.value) {
        let json = JSON.stringify({
            "year": loadedNote.year,
            "month": loadedNote.month,
            "day": loadedNote.day,
            "contents": textEditAreaElement.value
        });

        await fetch(`/save-the-day`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).then(async (res) => {
            let json = await res.json();
            if (noteIndexer[json["filename"]] == undefined) {
                noteIndexer[json["filename"]] = {todo: [], done: []}
            }
            noteIndexer[json["filename"]].todo = json["todo"];
            noteIndexer[json["filename"]].done = json["done"];
            loadMonthCalendar(current_selected_year, current_selected_month);
        });

        cloudState = textEditAreaElement.value;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    calendarContentElement = document.getElementById("calendar-content");
    calendarTitleElement = document.getElementById("calendar-title");
    textEditAreaElement = document.getElementById("text-edit-area");
    pastMonthButton = document.getElementById("past-month-button");
    futureMonthButton = document.getElementById("future-month-button");
    notAssignedElement = document.getElementById("not-assigned");
    
    futureMonthButton.addEventListener("click", () => {
        current_selected_month += 1;
        if (current_selected_month > 11) {
            current_selected_year += 1
            current_selected_month = 0
        }
        loadMonthCalendar(current_selected_year, current_selected_month)
    })

    pastMonthButton.addEventListener("click", () => {
        current_selected_month -= 1;
        if (current_selected_month < 0) {
            current_selected_year -= 1
            current_selected_month = 11
        }
        loadMonthCalendar(current_selected_year, current_selected_month)
    });

    notAssignedElement.addEventListener("click", daySelected.bind(this, 0, 0));

    textEditAreaElement.addEventListener("input", () => {
        if (is_unsaved == true) {
            autosave_start = null;
            return;
        }
        autosave_start = null;
        requestAnimationFrame(autosave_counter);
        is_unsaved = true;
    })

    document.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === "s") {
            e.preventDefault();

            if (loadedNote != null && cloudState != textEditAreaElement.value) {
                loadedNote.contents = textEditAreaElement.value
                let json = JSON.stringify(loadedNote);

                await fetch(`/save-the-day`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: json
                }).then(async (res) => {
                    let json = await res.json();
                    if (noteIndexer[json["filename"]] == undefined) {
                        noteIndexer[json["filename"]] = {todo: [], done: []};
                    }
                    noteIndexer[json["filename"]].todo = json["todo"];
                    noteIndexer[json["filename"]].done = json["done"];
                    loadMonthCalendar(current_selected_year, current_selected_month);
                });
            }
        }
    });

    fetch(`/request-indexer`, {
        method: 'POST'
    }).then(async (res) => {
        noteIndexer = await res.json();
        loadMonthCalendar(current_selected_year, current_selected_month);
    })
})

function loadMonthCalendar(year, month) {
    calendarContentElement.innerHTML = "";
    calendarTitleElement.innerHTML = `${MONTHS_STRINGS[current_selected_month]} ${current_selected_year}`;
    
    let date = new Date();
    date.setFullYear(year);
    date.setMonth(month);
    date.setDate(1);
    let day_of_the_week = date.getDay();

    let past_month = new Date(date);
    past_month.setDate(0);
    let last_day = past_month.getDate();

    for (let i = day_of_the_week; i > 0; i--) {
        let div = document.createElement("div");
        div.classList.add("calendar-day")
        div.innerHTML = last_day - i + 1;
        
        let color = getDayColor(past_month.getFullYear(), past_month.getMonth(), last_day - i + 1);

        if (isToday(past_month.getFullYear(), past_month.getMonth(), last_day - i + 1)) {
            div.classList.add("today");
        }

        color = {r: color.r * 0.835, g: color.g * 0.835, b: color.b * 0.835};
        
        div.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        
        calendarContentElement.appendChild(div);
    }

    let is_next_month = false;
    let current_month = date.getMonth();
    let current_day = 1;
    for (let i = 1; i < 36-day_of_the_week; i++) {
        date.setDate(current_day);

        if (date.getMonth() != current_month) {
            current_month = date.getMonth();
            current_day = 1;
            is_next_month = true;
        }

        let div = document.createElement("div");
        div.classList.add("calendar-day")
        div.innerHTML = current_day;

        let color = getDayColor(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (isToday(date.getFullYear(), date.getMonth(), date.getDate())) {
            div.classList.add("today");
        }
        if (is_next_month == true) {
            color = {r: color.r * 0.835, g: color.g * 0.835, b: color.b * 0.835};
        } else {
            div.addEventListener("click", daySelected.bind(this, current_month, current_day))
        }

        div.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;

        calendarContentElement.appendChild(div);

        current_day += 1;
    }
}

let selectLocked = false;
async function daySelected(month, day, _event) {
    selectLocked = true;

    if (loadedNote != null && cloudState != textEditAreaElement.value) {
        loadedNote.contents = textEditAreaElement.value
        let json = JSON.stringify(loadedNote);

        await fetch(`/save-the-day`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).then(async (res) => {
            let json = await res.json();
            if (noteIndexer[json["filename"]] == undefined) {
                noteIndexer[json["filename"]] = {todo: [], done: []};
            }
            noteIndexer[json["filename"]].todo = json["todo"];
            noteIndexer[json["filename"]].done = json["done"];
            loadMonthCalendar(current_selected_year, current_selected_month);
        });
    }

    loadedNote = {
        "year": current_selected_year.toString(),
        "month": (month + 1).toString(),
        "day": day.toString()
    };
    let json = JSON.stringify(loadedNote);
    
    let contents_response = await new Promise((res, _) => {
        fetch(`/request-day`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).then(async (response) => {
            let text = await response.text()
            selectLocked = false;
            return res(text);
        });
    });

    cloudState = contents_response;
    textEditAreaElement.value = contents_response;
    textEditAreaElement.focus();
}

function isToday(year, month, day) {
    let now = new Date();
    return year == now.getFullYear() && month == now.getMonth() && day == now.getDate();
}

function isPast(year, month, day) {
    let now = new Date();
    now.setHours(23, 59, 59);
    
    let date = new Date();
    date.setFullYear(year);
    date.setMonth(month);
    date.setDate(day);
    date.setHours(0, 0, 0, 0);

    return date.getTime() <= now.getTime();
}

function twoDigitify(a) {
    return a.toString().length < 2 ? `0${a}` : a
}

function lerp(a, b, c) {
    return a * (1.0 - c) + (b * c);
}

function getDayColor(year, month, day) {
    let color = {r: 240, g: 240, b: 240};
    let filename = `${year}-${twoDigitify(month+1)}-${twoDigitify(day)}`
    if (noteIndexer[filename] !== undefined) {
        let todo_length = noteIndexer[filename].todo.length;
        let done_length = noteIndexer[filename].done.length;
        if (todo_length == 0 && done_length == 0) {
            return color;
        }
        let done_ratio = done_length/(todo_length + done_length);
        if (isPast(year, month, day) == true) {
            let red_color = {r: color.r, g: color.g * (1.0 - (todo_length/7.0)), b: color.b * (1.0 - (todo_length/7.0))};
            color = {r: color.r  * (1.0 - done_ratio), g: color.g, b: color.b * (1.0 - done_ratio)};
            return {r: lerp(red_color.r, color.r, done_ratio), g: lerp(red_color.g, color.g, done_ratio), b: lerp(red_color.b, color.b, done_ratio)};
        } else {
            return {r: color.r, g: color.g * (1.0 - (todo_length/7.0)), b: color.b * (1.0 - (todo_length/7.0))};
        }
    }
    return color;
}