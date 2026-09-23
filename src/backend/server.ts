import express from "express";
import path from "path";
import fs from 'node:fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let storageDirPath = path.join(__dirname, `../../.storage/`);
let notesDirPath = path.join(storageDirPath, `notes/`);
let noteIndexerFilepath = path.join(storageDirPath, `notes_indexer.json`);

if (!fs.existsSync(storageDirPath)) {
    fs.mkdirSync(storageDirPath);
    fs.mkdirSync(notesDirPath);
    fs.writeFileSync(noteIndexerFilepath, "{}", {encoding: "utf-8"});            
} else {
    if (!fs.existsSync(notesDirPath)) {
        fs.mkdirSync(notesDirPath);
    } 
    if (!fs.existsSync(noteIndexerFilepath)) {
        fs.writeFileSync(noteIndexerFilepath, "{}", {encoding: "utf-8"});            
    }
}

let noteIndexer = JSON.parse(fs.readFileSync(noteIndexerFilepath, {"encoding": "utf-8"}));

function twoDigitify(a: number | string) {
    return a.toString().length < 2 ? `0${a}` : a
}

function initWebInterface() {
    const app = express();
    const PORT = 3000;

    app.use(express.static(path.join(__dirname, "../frontend")));
    app.use(express.json());

    app.post("/request-day", async (req, res) => {
        let filteredRequest: { [key: string]: string | undefined } = {
            "year": undefined,
            "month": undefined,
            "day": undefined
        };
        Object.keys(filteredRequest).forEach((x) => {
            filteredRequest[x] = req.body[x] || undefined;
        });

        let filename;
        //cheat for having a non used day.
        console.log(filteredRequest);
        if (filteredRequest["year"]! == "2026" && filteredRequest["month"]! == "1" && filteredRequest["day"]! == "0") {
            filename = "Not Assigned"
        } else {
            filename = `${filteredRequest["year"]}-${twoDigitify(filteredRequest["month"]!)}-${twoDigitify(filteredRequest["day"]!)}`;
        }
        
        let filepath = path.join(storageDirPath, `notes/${filename}.md`);
        let exists = fs.existsSync(filepath);
        if (exists) {
            let file_contents = fs.readFileSync(filepath, {"encoding": "utf-8"})
            res.send(file_contents);
        } else {
            res.send(`# ${filename}\n\n`);
        }
    });

    app.post("/save-the-day", async (req, res) => {
        let filteredRequest: { [key: string]: string | undefined } = {
            "year": undefined,
            "month": undefined,
            "day": undefined,
            "contents": undefined
        };
        Object.keys(filteredRequest).forEach((x) => {
            filteredRequest[x] = req.body[x] || undefined;
        });

        let filename;
        //cheat for having a non used day.
        if (filteredRequest["year"]! == "2026" && filteredRequest["month"]! == "1" && filteredRequest["day"]! == "0") {
            filename = "Not Assigned"
        } else {
            filename = `${filteredRequest["year"]}-${twoDigitify(filteredRequest["month"]!)}-${twoDigitify(filteredRequest["day"]!)}`;
        }
        let filepath = path.join(storageDirPath, `notes/${filename}.md`);
        fs.writeFileSync(filepath, filteredRequest["contents"]!, {encoding: "utf-8"});

        let file_todo = [...filteredRequest["contents"]!.matchAll(RegExp("^- .*", "gm"))];

        if (noteIndexer[filename] == undefined) {
            noteIndexer[filename] = {
                todo: [],
                done: []
            }
        }

        noteIndexer[filename].todo = []
        noteIndexer[filename].done = []
        for (let i = 0; i < file_todo.length; i++) {
            if (file_todo[i][0].match("DONE")) {
                noteIndexer[filename].done.push(file_todo[i][0]);
            } else {
                noteIndexer[filename].todo.push(file_todo[i][0]);
            }
        };

        fs.writeFileSync(noteIndexerFilepath, JSON.stringify(noteIndexer), {encoding: "utf-8"});
        
        res.json({
            "filename": filename,
            "done": noteIndexer[filename].done,
            "todo": noteIndexer[filename].todo
        });
    });

    app.post("/request-indexer", async (_req, res) => {
        res.json(noteIndexer);
    });

    app.listen(PORT, "127.0.0.1", () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

initWebInterface();